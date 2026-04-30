import { createClient } from '@supabase/supabase-js'

const URL   = 'https://sjaibytzqpxbvkvxwhoh.supabase.co'
const SVC   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqYWlieXR6cXB4YnZrdnh3aG9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAzMzU0MSwiZXhwIjoyMDkyNjA5NTQxfQ.FrX9U2NM-e-CDS5HwO1YMEjM7Ga1dlQuiYPID-OdhGc'
const ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqYWlieXR6cXB4YnZrdnh3aG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzM1NDEsImV4cCI6MjA5MjYwOTU0MX0.amTC2iyVlWSk8fJMib4em16G4OLzjAj1C0FUNixn0cY'

const admin = createClient(URL, SVC, { auth: { persistSession: false } })

const ok   = (msg) => console.log('  ✓', msg)
const fail = (msg) => { console.error('  ✗', msg); process.exit(1) }
const sep  = (t)   => console.log(`\n=== ${t} ===`)

async function run() {
  const TEST_EMAIL = `test_${Date.now()}@pipeflow.dev`
  const TEST_PASS  = 'Test@12345'
  const TEST_NAME  = 'Usuário Teste'
  let userId

  // ── 1. Signup ────────────────────────────────────────────────
  sep('1. Signup (simula supabase.auth.signUp com email_confirm=true)')
  const { data: { user }, error: signupErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASS,
    email_confirm: true,
    user_metadata: { name: TEST_NAME },
  })
  if (signupErr) fail(`signup: ${signupErr.message}`)
  userId = user.id
  ok(`Usuário criado  id=${userId}  email=${user.email}`)

  // ── 2. Trigger → profile criado automaticamente ───────────────
  sep('2. Trigger on_auth_user_created → profiles')
  await new Promise(r => setTimeout(r, 800))
  const { data: profile, error: profileErr } = await admin
    .from('profiles').select('*').eq('id', userId).single()
  if (profileErr) fail(`perfil não criado pelo trigger: ${profileErr.message}`)
  if (profile.name !== TEST_NAME) fail(`nome errado no perfil: "${profile.name}" ≠ "${TEST_NAME}"`)
  ok(`Profile criado  name="${profile.name}"  email="${profile.email}"`)

  // ── 3. Login real com anon key (exatamente como o browser faz) ──
  sep('3. Login com signInWithPassword (anon key — igual ao browser)')
  const browserClient = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: loginData, error: loginErr } = await browserClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  })
  if (loginErr) fail(`login: ${loginErr.message}`)
  ok(`Login OK  session obtida  user_id=${loginData.user.id}`)
  const token = loginData.session.access_token

  // ── 4. Onboarding: criar workspace com o token do usuário ─────
  // O trigger on_workspace_created insere o membro como admin automaticamente
  sep('4. Onboarding — criar workspace (trigger faz insert em workspace_members)')
  const authed = createClient(URL, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { error: wsErr } = await authed
    .from('workspaces')
    .insert({ name: 'Empresa Teste', plan: 'free' })
  if (wsErr) fail(`workspace: ${wsErr.message}`)
  ok(`Workspace criado`)

  // Aguardar trigger
  await new Promise(r => setTimeout(r, 400))

  // ── 5. RLS — workspaces visíveis ─────────────────────────────
  sep('5. RLS — workspace visível para o usuário autenticado')
  const { data: myWorkspaces, error: wsRlsErr } = await authed
    .from('workspaces').select('id,name,plan')
  if (wsRlsErr) fail(`RLS workspaces: ${wsRlsErr.message}`)
  if (!myWorkspaces?.length) fail('RLS workspaces: retornou vazio — política SELECT falhou')
  const ws = myWorkspaces[0]
  ok(`Workspaces visíveis: ${myWorkspaces.map(w => `"${w.name}"`).join(', ')}`)

  // ── 6. workspace_members inserido pelo trigger ────────────────
  sep('6. Trigger on_workspace_created → workspace_members')
  const { data: members, error: memErr } = await authed
    .from('workspace_members').select('id,role,workspace_id,profile_id')
  if (memErr) fail(`workspace_members: ${memErr.message}`)
  if (!members?.length) fail('workspace_members vazio — trigger não disparou')
  const m = members[0]
  if (m.profile_id !== userId) fail(`profile_id errado: ${m.profile_id} ≠ ${userId}`)
  if (m.role !== 'admin') fail(`role errado: ${m.role} ≠ admin`)
  ok(`Membro inserido pelo trigger  role=${m.role}  workspace_id=${m.workspace_id}`)

  // ── 7. RLS — perfil visível ───────────────────────────────────
  sep('7. RLS — perfil visível para o próprio usuário')
  const { data: myProfile, error: pRlsErr } = await authed
    .from('profiles').select('id,name,email').eq('id', loginData.user.id).single()
  if (pRlsErr) fail(`RLS perfil: ${pRlsErr.message}`)
  ok(`Perfil via RLS  name="${myProfile.name}"`)

  // ── 8. RPC current_user_workspace_ids ────────────────────────
  sep('8. RPC current_user_workspace_ids()')
  const { data: wsIds, error: rpcErr } = await authed.rpc('current_user_workspace_ids')
  if (rpcErr) fail(`RPC: ${rpcErr.message}`)
  if (!wsIds?.length) fail('RPC retornou vazio')
  if (!wsIds.includes(ws.id)) fail(`ID ${ws.id} ausente no resultado da RPC`)
  ok(`RPC retornou: [${wsIds.join(', ')}]`)

  // ── 9. Logout ─────────────────────────────────────────────────
  sep('9. Logout')
  await browserClient.auth.signOut()
  const { data: { user: postLogout } } = await browserClient.auth.getUser()
  if (postLogout !== null) fail('Após logout, getUser() ainda retorna usuário')
  ok('Após logout, getUser() retorna null')

  // ── 10. Proteção RLS sem token ────────────────────────────────
  sep('10. Proteção RLS — cliente sem token não vê dados')
  const anonClient = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: anonWs } = await anonClient.from('workspaces').select('id').limit(1)
  if (anonWs?.length) fail('Sem autenticação, workspaces retornou dados — RLS quebrado!')
  ok('Sem token → workspaces retorna [] (RLS protegendo)')

  const { data: anonMembers } = await anonClient.from('workspace_members').select('id').limit(1)
  if (anonMembers?.length) fail('Sem autenticação, workspace_members retornou dados — RLS quebrado!')
  ok('Sem token → workspace_members retorna [] (RLS protegendo)')

  // ── Limpeza ───────────────────────────────────────────────────
  sep('Limpeza')
  await admin.auth.admin.deleteUser(userId)
  ok(`Usuário de teste removido (cascade: profiles, workspace_members, workspaces)`)

  console.log('\n✅  TODOS OS 10 TESTES PASSARAM\n')
}

run().catch(e => { console.error('\nFATAL:', e.message, e.stack); process.exit(1) })

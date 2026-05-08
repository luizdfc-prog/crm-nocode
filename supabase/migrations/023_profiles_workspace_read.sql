-- 023_profiles_workspace_read.sql
-- Permite que membros do mesmo workspace leiam os profiles uns dos outros.
-- Sem isso, a tela de Membros nas Settings mostra "Usuário" para todos exceto o próprio usuário.

create policy "profiles: membros do mesmo workspace podem ler"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members wm1
      join public.workspace_members wm2
        on wm1.workspace_id = wm2.workspace_id
      where wm1.profile_id = auth.uid()
        and wm2.profile_id = profiles.id
    )
  );

-- Garante que todos os workspaces com agent_config tenham a estrutura de follow_up.
-- Idempotente: só atualiza onde o campo ainda não existe.

UPDATE workspaces
SET agent_config = COALESCE(agent_config, '{}'::jsonb) || jsonb_build_object(
  'follow_up', jsonb_build_object(
    'enabled', true,
    'silence_hours', 2,
    'steps', jsonb_build_array(
      jsonb_build_object(
        'stage', 'Aguardando Resposta',
        'delay_hours', 2,
        'message', 'Olá! Tudo bem? Ainda posso te ajudar com alguma dúvida? 😊'
      ),
      jsonb_build_object(
        'stage', 'Follow-up 01',
        'delay_hours', 4,
        'message', 'Ei, percebi que você não respondeu ainda. Fico por aqui caso precise! 👋'
      ),
      jsonb_build_object(
        'stage', 'Follow-up 02',
        'delay_hours', 8,
        'message', 'Última tentativa de contato. Se mudar de ideia, é só chamar! 🙏'
      )
    )
  )
)
WHERE agent_config IS NULL
   OR NOT (agent_config ? 'follow_up');

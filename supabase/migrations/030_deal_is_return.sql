-- Adiciona coluna is_return: indica que o card foi criado porque o lead
-- retornou após um deal anterior encerrado (fechado_ganho ou fechado_perdido).
-- Exibido como badge "Retorno" em vermelho no DealCard.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS is_return boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.deals.is_return IS
  'true = lead retornou após deal anterior encerrado (novo ciclo de vendas)';

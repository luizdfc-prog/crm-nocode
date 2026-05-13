-- Textos personalizados dos botões WhatsApp do catálogo
ALTER TABLE public.catalog_config
  ADD COLUMN IF NOT EXISTS cta_message text NOT NULL DEFAULT 'Olá! Vi seu catálogo e tenho interesse.',
  ADD COLUMN IF NOT EXISTS cta_product_message text NOT NULL DEFAULT 'Olá! Tenho interesse no produto: *{produto}*';
-- {produto} é substituído pelo nome do produto em tempo de execução

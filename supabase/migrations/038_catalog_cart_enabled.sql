-- Habilita o carrinho como opção configurável no catálogo
ALTER TABLE catalog_config
  ADD COLUMN IF NOT EXISTS cart_enabled boolean NOT NULL DEFAULT false;

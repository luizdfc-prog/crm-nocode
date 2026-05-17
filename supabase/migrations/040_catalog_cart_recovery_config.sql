ALTER TABLE catalog_config
  ADD COLUMN IF NOT EXISTS cart_recovery_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cart_recovery_text text NOT NULL DEFAULT 'Você deixou itens no carrinho — continue de onde parou!';

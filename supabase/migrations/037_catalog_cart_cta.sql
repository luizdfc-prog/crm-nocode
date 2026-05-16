-- Adiciona campo de CTA do carrinho no catálogo
ALTER TABLE catalog_config
  ADD COLUMN IF NOT EXISTS cart_cta_text text NOT NULL DEFAULT '+ Finalizar Pedido';

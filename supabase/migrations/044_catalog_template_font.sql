-- Adiciona campos de template visual e fonte à vitrine
ALTER TABLE catalog_config
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS font_family TEXT NOT NULL DEFAULT 'DM Sans';

-- Garante valores válidos de template
ALTER TABLE catalog_config
  ADD CONSTRAINT catalog_config_template_check
    CHECK (template IN ('dark', 'light', 'bold'));

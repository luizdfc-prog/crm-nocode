-- Adiciona controle de posição do banner (imagem única)
ALTER TABLE catalog_config
  ADD COLUMN IF NOT EXISTS banner_position varchar(40) DEFAULT 'center center';

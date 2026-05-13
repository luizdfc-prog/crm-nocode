-- Adiciona suporte a banner tipo vídeo ou carrossel de imagens
ALTER TABLE public.catalog_config
  ADD COLUMN IF NOT EXISTS banner_type text NOT NULL DEFAULT 'image',   -- 'image' | 'video' | 'carousel'
  ADD COLUMN IF NOT EXISTS banner_slides jsonb NOT NULL DEFAULT '[]'::jsonb, -- array de URLs para carousel
  ADD COLUMN IF NOT EXISTS banner_video_url text;                        -- URL do vídeo (mp4/webm)

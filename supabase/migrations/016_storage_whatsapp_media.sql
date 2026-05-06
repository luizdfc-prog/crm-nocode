-- Bucket público para armazenar mídia recebida via WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir leitura pública
CREATE POLICY "Public read whatsapp-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'whatsapp-media');

-- Permitir inserção via service role (sem restrição de auth)
CREATE POLICY "Service role insert whatsapp-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'whatsapp-media');

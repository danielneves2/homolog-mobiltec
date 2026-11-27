-- D531: nomes personalizados das linhas da ficha por tipo e valores das linhas criadas no registro
ALTER TABLE "categoria" ADD COLUMN IF NOT EXISTS "rotulos_ficha" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "homologacao" ADD COLUMN IF NOT EXISTS "campos_extras" JSONB NOT NULL DEFAULT '{}';

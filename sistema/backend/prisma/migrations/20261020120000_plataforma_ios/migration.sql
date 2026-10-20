-- iOS (D502): gerenciamento BYOD/Supervisionado, plataforma do tipo e
-- funcionalidades/compatibilidade por item de teste.
ALTER TYPE "TipoGerenciamento" ADD VALUE IF NOT EXISTS 'IOS_BYOD';
ALTER TYPE "TipoGerenciamento" ADD VALUE IF NOT EXISTS 'IOS_SUPERVISIONADO';

ALTER TABLE "categoria" ADD COLUMN IF NOT EXISTS "plataforma" TEXT NOT NULL DEFAULT 'ANDROID';

ALTER TABLE "item_teste" ADD COLUMN IF NOT EXISTS "somente_supervisionado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "item_teste" ADD COLUMN IF NOT EXISTS "funcionalidades" JSONB NOT NULL DEFAULT '[]';

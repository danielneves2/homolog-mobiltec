-- AlterTable
ALTER TABLE "homologacao" ADD COLUMN     "assinatura_apoio" TEXT,
ADD COLUMN     "assinatura_gerente" TEXT,
ADD COLUMN     "assinatura_responsavel" TEXT,
ADD COLUMN     "fontes" JSONB NOT NULL DEFAULT '[]';

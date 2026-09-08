-- CreateEnum
CREATE TYPE "GrupoItem" AS ENUM ('TELEMETRIA', 'COLETA', 'COMANDOS', 'PERFIS');

-- CreateEnum
CREATE TYPE "StatusResultado" AS ENUM ('OK', 'FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA', 'NAO_TESTADO', 'NAO_APLICAVEL');

-- CreateEnum
CREATE TYPE "TipoGerenciamento" AS ENUM ('ANDROID_LEGADO', 'ANDROID_ENTERPRISE');

-- CreateEnum
CREATE TYPE "StatusHomologacao" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'APROVADO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "FormatoCertificado" AS ENUM ('PDF', 'PPTX');

-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'HOMOLOGADOR', 'LEITOR');

-- CreateTable
CREATE TABLE "categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icone" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'HOMOLOGADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo" (
    "id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "nome_comercial" TEXT NOT NULL,
    "foto_url" TEXT,
    "link_fabricante" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_teste" (
    "id" TEXT NOT NULL,
    "grupo" "GrupoItem" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao_acao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "item_teste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bateria_teste" (
    "id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bateria_teste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bateria_item" (
    "bateria_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bateria_item_pkey" PRIMARY KEY ("bateria_id","item_id")
);

-- CreateTable
CREATE TABLE "justificativa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "fontes" JSONB NOT NULL DEFAULT '[]',
    "itens_sugeridos" TEXT[],
    "android_min" INTEGER,
    "gerenciamento" "TipoGerenciamento",
    "uso_count" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "justificativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologacao" (
    "id" TEXT NOT NULL,
    "dispositivo_id" TEXT NOT NULL,
    "bateria_id" TEXT NOT NULL,
    "numero_serie" TEXT NOT NULL,
    "imei_1" TEXT,
    "imei_2" TEXT,
    "versao_so" TEXT NOT NULL,
    "gerenciamento" "TipoGerenciamento" NOT NULL,
    "tipo_agente" TEXT NOT NULL,
    "versao_agente" TEXT NOT NULL,
    "ferramenta" TEXT,
    "metodo_inscricao" TEXT NOT NULL,
    "assinatura_agente" BOOLEAN NOT NULL DEFAULT false,
    "precisa_assinatura_dev" BOOLEAN NOT NULL DEFAULT false,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "responsavel_id" TEXT NOT NULL,
    "gerente_id" TEXT,
    "apoio_id" TEXT,
    "status" "StatusHomologacao" NOT NULL DEFAULT 'RASCUNHO',
    "homologado" BOOLEAN,
    "local_emissao" TEXT NOT NULL DEFAULT 'São Paulo',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homologacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultado" (
    "id" TEXT NOT NULL,
    "homologacao_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "status" "StatusResultado" NOT NULL DEFAULT 'NAO_TESTADO',
    "observacao" TEXT,
    "justificativa_id" TEXT,
    "justificativa_texto" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificado_emitido" (
    "id" TEXT NOT NULL,
    "homologacao_id" TEXT NOT NULL,
    "formato" "FormatoCertificado" NOT NULL,
    "arquivo_url" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "emitido_por" TEXT NOT NULL,
    "emitido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificado_emitido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_reabertura" (
    "id" TEXT NOT NULL,
    "homologacao_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_reabertura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_slug_key" ON "categoria"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_fabricante_modelo_key" ON "dispositivo"("fabricante", "modelo");

-- CreateIndex
CREATE UNIQUE INDEX "resultado_homologacao_id_item_id_key" ON "resultado"("homologacao_id", "item_id");

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bateria_teste" ADD CONSTRAINT "bateria_teste_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bateria_item" ADD CONSTRAINT "bateria_item_bateria_id_fkey" FOREIGN KEY ("bateria_id") REFERENCES "bateria_teste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bateria_item" ADD CONSTRAINT "bateria_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_teste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologacao" ADD CONSTRAINT "homologacao_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologacao" ADD CONSTRAINT "homologacao_bateria_id_fkey" FOREIGN KEY ("bateria_id") REFERENCES "bateria_teste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologacao" ADD CONSTRAINT "homologacao_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologacao" ADD CONSTRAINT "homologacao_gerente_id_fkey" FOREIGN KEY ("gerente_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologacao" ADD CONSTRAINT "homologacao_apoio_id_fkey" FOREIGN KEY ("apoio_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_homologacao_id_fkey" FOREIGN KEY ("homologacao_id") REFERENCES "homologacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_teste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_justificativa_id_fkey" FOREIGN KEY ("justificativa_id") REFERENCES "justificativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificado_emitido" ADD CONSTRAINT "certificado_emitido_homologacao_id_fkey" FOREIGN KEY ("homologacao_id") REFERENCES "homologacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificado_emitido" ADD CONSTRAINT "certificado_emitido_emitido_por_fkey" FOREIGN KEY ("emitido_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_reabertura" ADD CONSTRAINT "log_reabertura_homologacao_id_fkey" FOREIGN KEY ("homologacao_id") REFERENCES "homologacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_reabertura" ADD CONSTRAINT "log_reabertura_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

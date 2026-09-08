-- AlterTable
ALTER TABLE "categoria" ADD COLUMN     "campos_ficha" TEXT[] DEFAULT ARRAY[]::TEXT[];

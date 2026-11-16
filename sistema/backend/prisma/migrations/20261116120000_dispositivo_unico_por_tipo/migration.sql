-- D524: fabricante + modelo é único dentro do tipo de dispositivo, não no sistema todo
CREATE UNIQUE INDEX "dispositivo_categoria_id_fabricante_modelo_key" ON "dispositivo"("categoria_id", "fabricante", "modelo");
DROP INDEX "dispositivo_fabricante_modelo_key";

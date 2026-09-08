# -*- coding: utf-8 -*-
"""
Extrai a planilha "Homologação PoS.xlsx" (aba GERAL) para planilha-pos.json.

Só transcreve — não interpreta. A tradução de "Sim"/"Não"/"Testar" para os
status do sistema é feita no importar-planilha.ts, onde fica visível e revisável.

    python prisma/dados/extrair-planilha.py "C:\\caminho\\Homologação PoS.xlsx"

Requer: pip install openpyxl
"""
import json
import os
import sys

import openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "planilha-pos.json")

# Colunas dos modelos na aba GERAL: D (4) até AH (34).
PRIMEIRA_COLUNA, ULTIMA_COLUNA = 4, 34

# Linhas do cabeçalho → campo da ficha.
FICHA = {
    2: "homologado",
    3: "nomeComercial",
    4: "versaoPos",
    5: "imei1",
    6: "imei2",
    7: "numeroSerie",
    8: "tipoAgente",
    9: "versaoAgente",
    10: "gerenciamento",
    11: "ferramenta",
    12: "precisaAssinaturaDev",
    13: "android",
    14: "fabricante",
    15: "modelo",
}

# Linha da planilha → item do catálogo de 48 (grupo::nome), exatamente como
# estão no seed. Os grupos da planilha não têm o mesmo nome dos do catálogo:
#   "COLETA DE DADOS" → TELEMETRIA, "INFORMAÇÕES" → COLETA.
#
# Dois itens do catálogo não existem na planilha e ficam de fora de propósito:
# TELEMETRIA::Histórico de Bateria e TELEMETRIA::Sinal de Rede (4G/Wi-Fi).
ITENS = {
    17: "TELEMETRIA::Nível de Bateria",
    18: "TELEMETRIA::Status de Memória RAM",
    19: "TELEMETRIA::Consumo de Dados Móveis",
    20: "TELEMETRIA::Status de Armazenamento",
    21: "TELEMETRIA::Última Localização",
    22: "TELEMETRIA::Histórico de Localização",
    23: "TELEMETRIA::Aplicativos Instalados",
    24: "TELEMETRIA::Tempo de Uso Apps",
    25: "TELEMETRIA::Consumo WiFi por App",
    26: "TELEMETRIA::Consumo 4G por Apps",
    28: "COLETA::IMEI 1",
    29: "COLETA::IMEI 2",
    30: "COLETA::Número de Série",
    31: "COLETA::Rede WiFi",
    32: "COLETA::Endereço IP",
    33: "COLETA::Operadora",
    34: "COLETA::Fabricante",
    35: "COLETA::Modelo",
    36: "COLETA::Precisão GPS",
    37: "COLETA::Saúde da Bateria",
    38: "COLETA::SIM Card",
    40: "COMANDOS::Desabilitar / Habilitar",
    41: "COMANDOS::Alarme",
    42: "COMANDOS::Reiniciar",
    43: "COMANDOS::Bloquear",
    44: "COMANDOS::Desbloquear",
    45: "COMANDOS::Wipe",
    46: "COMANDOS::Requisitar Logs",
    47: "COMANDOS::Visualização Remota",
    48: "COMANDOS::Acesso Remoto",
    49: "COMANDOS::Instalação",
    50: "COMANDOS::Desinstalação",
    51: "COMANDOS::Limpeza de Dados",
    52: "COMANDOS::Instalação Silenciosa",
    53: "COMANDOS::Instalação Automática",
    54: "COMANDOS::Requisito de Instalação",
    55: "COMANDOS::Mensagem",
    58: "PERFIS::Configuração de Monitores",
    59: "PERFIS::Políticas de Senhas",
    60: "PERFIS::Configuração de Launcher",
    61: "PERFIS::Time Fencing",
    62: "PERFIS::Apps Bloqueados",
    63: "PERFIS::Instalação de Apps",
    64: "PERFIS::Instalação de Conteúdo",
    65: "PERFIS::APN Automática",
    66: "PERFIS::Zero-Touch",
}


def main(caminho_xlsx):
    ws = openpyxl.load_workbook(caminho_xlsx, data_only=True)["GERAL"]

    def cel(linha, coluna):
        v = ws.cell(row=linha, column=coluna).value
        return "" if v is None else str(v).strip()

    modelos = []
    for coluna in range(PRIMEIRA_COLUNA, ULTIMA_COLUNA + 1):
        nome = cel(3, coluna)
        if not nome:
            continue
        modelos.append({
            "coluna": coluna,
            "ficha": {campo: cel(linha, coluna) for linha, campo in FICHA.items()},
            "respostas": {chave: cel(linha, coluna) for linha, chave in ITENS.items()},
        })

    dados = {
        "origem": os.path.basename(caminho_xlsx),
        "aba": "GERAL",
        "modelos": modelos,
    }
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=1)
        f.write("\n")

    print(f"{len(modelos)} modelos x {len(ITENS)} itens -> {SAIDA}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])

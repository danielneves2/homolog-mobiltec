# =====================================================================
#  Vigia — desliga os servidores quando a janela do Iniciar some.
#
#  Existe porque fechar uma janela no X não roda código de limpeza: o
#  Windows encerra o processo e pronto. Sem alguém de fora observando, o
#  node e o postgres ficariam vivos e invisíveis, segurando as portas.
#
#  Roda escondido, em console próprio — se compartilhasse o console do
#  Iniciar, morreria junto com ele e não teria a quem enterrar.
# =====================================================================

# Portas e PIDs em parâmetros separados, e não numa lista: passada como
# "-Portas 8080,3001", a vírgula foi lida como separador de milhar e o vigia
# acabou vigiando a porta 80803001 — que não existe, então ele encerrava
# sem derrubar nada.
param(
  [Parameter(Mandatory = $true)][int]$PaiPid,
  [Parameter(Mandatory = $true)][string]$PgCtl,
  [Parameter(Mandatory = $true)][string]$PgData,
  [Parameter(Mandatory = $true)][int]$PortaWeb,
  [Parameter(Mandatory = $true)][int]$PortaApi,
  [int]$PidBackend = 0,
  [int]$PidFrontend = 0
)

$ErrorActionPreference = 'SilentlyContinue'
$AQUI = Split-Path -Parent $PSCommandPath
$LOGS = Join-Path $AQUI 'logs'

# Registro próprio: o vigia não tem janela, e sem isto um erro nele seria
# invisível — exatamente o tipo de falha que só aparece quando as portas
# amanhecem ocupadas.
$diario = Join-Path $LOGS 'vigia.log'
function Anotar($texto) {
  "$((Get-Date).ToString('HH:mm:ss'))  $texto" | Out-File -FilePath $diario -Append -Encoding UTF8
}

Anotar "vigia no ar — janela PID $PaiPid | portas $PortaWeb e $PortaApi | npm $PidBackend/$PidFrontend"

while (Get-Process -Id $PaiPid -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 2 }

Anotar 'a janela sumiu — desligando'

<#
  Derruba a ÁRVORE, não só o processo.

  `npm run dev` vira npm.cmd -> cmd.exe -> node. Matar só quem escuta a
  porta deixa o npm e o supervisor do tsx de pé — e o tsx religa o filho
  que acabou de morrer, ressuscitando o servidor. `taskkill /T` leva a
  descendência junto.
#>
function DerrubarArvore($processo, $rotulo) {
  if ($processo -le 0) { return }
  if (-not (Get-Process -Id $processo -ErrorAction SilentlyContinue)) { return }
  $r = Start-Process -FilePath 'taskkill.exe' -ArgumentList @('/PID', $processo, '/T', '/F') `
    -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $LOGS 'taskkill.out.log') `
    -RedirectStandardError (Join-Path $LOGS 'taskkill.err.log')
  $r.WaitForExit()
  Anotar "  $rotulo — árvore do PID $processo encerrada (código $($r.ExitCode))"
}

DerrubarArvore $PidBackend  'backend'
DerrubarArvore $PidFrontend 'interface'

# Rede de segurança: se algum neto escapou da árvore, ele ainda aparece
# como dono da porta.
foreach ($porta in @($PortaWeb, $PortaApi)) {
  $donos = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processo in $donos) {
    Anotar "  porta $porta ainda ocupada — encerrando PID $processo"
    Stop-Process -Id $processo -Force -ErrorAction SilentlyContinue
  }
}

<#
  Parada educada do banco.

  Com redirecionamento explícito e código de saída no registro: a versão
  anterior chamava `Start-Process -Wait` sem nada disso, o pg_ctl falhava
  em silêncio e o log dizia "banco parado" com o postgres vivo.
#>
if (Test-Path $PgCtl) {
  # Aspas no caminho: a pasta do projeto tem espaço no nome, e o
  # `Start-Process` junta os argumentos sem citar nada.
  $pg = Start-Process -FilePath $PgCtl -ArgumentList @('-D', "`"$PgData`"", '-m', 'fast', '-w', 'stop') `
    -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $LOGS 'pg-stop.saida.log') `
    -RedirectStandardError (Join-Path $LOGS 'pg-stop.erro.log')
  $pg.WaitForExit()
  $sobrou = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
  if ($sobrou) {
    Anotar "  banco NÃO parou (pg_ctl saiu com $($pg.ExitCode)) — veja pg-stop.erro.log"
  } else {
    Anotar '  banco parado'
  }
} else {
  Anotar "  pg_ctl não encontrado em $PgCtl"
}

Anotar 'desligado'

# =====================================================================
#  Homologação Mobiltec — inicia o sistema inteiro numa janela só.
#
#  Sobe PostgreSQL, backend e frontend, publica na rede local e desliga
#  tudo quando esta janela é fechada.
#
#  O desligamento não depende de este script chegar ao fim: fechar a
#  janela no X encerra o processo sem rodar limpeza nenhuma. Quem garante
#  é o `Vigia.ps1`, lançado escondido e em console próprio, que espera
#  este processo sumir e então derruba o que ficou de pé.
#
#  Uma tentativa anterior usava Job Object do Windows com
#  KILL_ON_JOB_CLOSE. Foi descartada: medido nesta máquina, o filho fica
#  registrado no job (IsProcessInJob = True) e ainda assim sobrevive à
#  morte do pai — o PowerShell já roda dentro de um job, e o aninhamento
#  não propaga o encerramento.
# =====================================================================

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$AQUI      = Split-Path -Parent $PSCommandPath
$RAIZ      = Split-Path -Parent $AQUI
$BACKEND   = Join-Path $RAIZ 'backend'
$FRONTEND  = Join-Path $RAIZ 'frontend'
$PGCTL     = Join-Path $RAIZ 'pgsql\bin\pg_ctl.exe'
$PGDATA    = Join-Path $RAIZ 'pgdata'
$LOGS      = Join-Path $AQUI 'logs'
$VIGIA     = Join-Path $AQUI 'Vigia.ps1'

$PORTA_WEB = 8080
$PORTA_API = 3001
$PORTA_BD  = 5432

New-Item -ItemType Directory -Force -Path $LOGS | Out-Null

$Host.UI.RawUI.WindowTitle = 'Homologação Mobiltec — servidor'

function Escrever($texto, $cor = 'Gray') { Write-Host $texto -ForegroundColor $cor }
function Passo($texto) { Write-Host "  $texto" -NoNewline -ForegroundColor Gray }
function Ok($texto = 'pronto') { Write-Host "  $texto" -ForegroundColor Green }
function Falha($texto) { Write-Host "  $texto" -ForegroundColor Red }

Clear-Host
Escrever ''
Escrever '   HOMOLOGAÇÃO MOBILTEC' 'Magenta'
Escrever '   Cloud4Mobile — painel de homologação de dispositivos' 'DarkGray'
Escrever ''

# ---------------------------------------------------------------------
# Uma instância só
#
# Duas janelas abertas brigariam pelas mesmas portas, e a segunda mataria
# os servidores da primeira ao liberá-las.
# ---------------------------------------------------------------------
$criouMutex = $false
$mutex = New-Object System.Threading.Mutex($true, 'Local\HomologacaoMobiltecServidor', [ref]$criouMutex)
if (-not $criouMutex) {
  Escrever '   O servidor já está rodando em outra janela.' 'Yellow'
  Escrever '   Procure "Homologação Mobiltec — servidor" na barra de tarefas.' 'DarkGray'
  Escrever ''
  Read-Host '   Enter para fechar'
  exit 0
}

# ---------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------
function DonoDaPorta($porta) {
  $c = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue
  if ($c) { return ($c | Select-Object -ExpandProperty OwningProcess -Unique) }
  return @()
}

function LiberarPorta($porta) {
  foreach ($processo in (DonoDaPorta $porta)) {
    try { Stop-Process -Id $processo -Force -ErrorAction Stop } catch {}
  }
}

function EsperarPorta($porta, $segundos = 60) {
  $limite = (Get-Date).AddSeconds($segundos)
  while ((Get-Date) -lt $limite) {
    if ((DonoDaPorta $porta).Count -gt 0) { return $true }
    Start-Sleep -Milliseconds 400
  }
  return $false
}

function EsperarResposta($url, $segundos = 60) {
  $limite = (Get-Date).AddSeconds($segundos)
  while ((Get-Date) -lt $limite) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) { return $true }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  return $false
}

<#
  Roda um executável nativo e devolve o código de saída.

  Não usa `& exe | ...` por dois motivos, os dois já custaram depuração:

  1. Com `ErrorActionPreference = Stop`, qualquer linha que o programa
     escreva em stderr vira erro terminante no PowerShell 5.1 — e o
     `pg_ctl` escreve avisos ali mesmo quando funciona. O que decide é o
     código de saída, não o barulho.

  2. O `pg_ctl start` deixa o postgres rodando, e o postgres HERDA a saída
     padrão de quem o criou. Num pipeline isso mantém o cano aberto para
     sempre: o `pg_ctl` termina, o pipeline não, e o script trava na
     primeira linha. Com `Start-Process` o filho recebe handles próprios.
#>
function Executar($exe, $argumentos, $rotulo) {
  # `Start-Process` monta a linha de comando juntando os argumentos com
  # espaço, sem citar nada. A pasta do projeto é "Homolog Mobiltec", com
  # espaço no meio: sem as aspas o pg_ctl recebia o caminho partido e
  # reclamava de "modo de operação desconhecido".
  $lista = @($argumentos | ForEach-Object {
    $texto = [string]$_
    if ($texto -match '\s' -and -not $texto.StartsWith('"')) { "`"$texto`"" } else { $texto }
  })
  $processo = Start-Process -FilePath $exe -ArgumentList $lista -NoNewWindow -PassThru `
    -RedirectStandardOutput (Join-Path $LOGS "$rotulo.saida.log") `
    -RedirectStandardError  (Join-Path $LOGS "$rotulo.erro.log")
  $processo.WaitForExit()
  return $processo.ExitCode
}

<#
  IP que os colegas usam para chegar aqui.

  Vale o da interface por onde sai a rota padrão: a máquina também tem
  adaptador virtual (192.168.56.1, do VirtualBox), e um link com ele não
  abre em ninguém.
#>
function IpDaRede {
  try {
    $rota = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
      Sort-Object RouteMetric, ifMetric | Select-Object -First 1
    $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $rota.ifIndex -ErrorAction Stop |
      Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
      Select-Object -First 1
    if ($ip) { return $ip.IPAddress }
  } catch {}
  return 'localhost'
}

<#
  Garante que o firewall deixa a equipe entrar.

  Sem regra própria, o acesso pela rede depende das permissões genéricas
  que o Windows criou para o `node.exe` quando ele pediu — e essas somem
  ou deixam de valer quando o Node é atualizado ou reinstalado noutro
  caminho. Aqui a regra é do sistema, pela porta, e sobrevive a isso.

  Duas escolhas deliberadas:

  - Vale em todos os perfis de rede. A Wi-Fi desta máquina está
    classificada como Pública, e uma regra só para "Privada" não pegaria
    — o link simplesmente não abriria para ninguém.

  - Restrita à SUB-REDE LOCAL. Como o perfil é Público e um notebook
    entra em rede de hotel e cafeteria, liberar a porta para qualquer
    origem exporia o sistema fora da empresa. `LocalSubnet` mantém o
    alcance em quem está na mesma rede — que é o caso de uso pedido.

  Pede elevação uma vez só: criada a regra, as próximas execuções
  encontram e seguem em silêncio.
#>
$NOME_REGRA = 'Homologação Mobiltec (porta 8080)'

function GarantirFirewall {
  if (Get-NetFirewallRule -DisplayName $NOME_REGRA -ErrorAction SilentlyContinue) {
    return 'liberado'
  }

  $comando = "New-NetFirewallRule -DisplayName '$NOME_REGRA' " +
    "-Description 'Permite que a equipe acesse o painel de homologacao pela rede local.' " +
    "-Direction Inbound -Action Allow -Protocol TCP -LocalPort $PORTA_WEB " +
    "-Profile Any -RemoteAddress LocalSubnet -Enabled True | Out-Null"

  try {
    $elevado = Start-Process -FilePath 'powershell.exe' -Verb RunAs -WindowStyle Hidden -PassThru `
      -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', "`"$comando`"")
    $elevado.WaitForExit()
  } catch {
    # O usuário recusou o aviso do Windows
    return 'recusado'
  }

  if (Get-NetFirewallRule -DisplayName $NOME_REGRA -ErrorAction SilentlyContinue) {
    return 'criado'
  }
  return 'recusado'
}

function Servir($pasta, $nome) {
  return Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev') -WorkingDirectory $pasta `
    -NoNewWindow -PassThru `
    -RedirectStandardOutput (Join-Path $LOGS "$nome.log") `
    -RedirectStandardError  (Join-Path $LOGS "$nome.erro.log")
}

$processos = @()

try {
  # -------------------------------------------------------------------
  # 1. Banco de dados
  # -------------------------------------------------------------------
  Passo 'Banco de dados ..............'
  $envBackend = Join-Path $BACKEND '.env'
  $usaRemoto = $false
  $rotuloRemoto = ''
  if (Test-Path $envBackend) {
    $conteudoEnv = Get-Content $envBackend -Raw
    if ($conteudoEnv -match 'DATABASE_URL="?postgresql://[^@]+@([^:/]+)' -and $matches[1] -notmatch 'localhost|127\.0\.0\.1') {
      $usaRemoto = $true
      $rotuloRemoto = if ($matches[1] -like '*supabase*') { 'Supabase (nuvem)' } else { "remoto ($($matches[1]))" }
    }
  }

  if ($usaRemoto) {
    Ok $rotuloRemoto
  } else {
    $saidaPg = Join-Path $LOGS 'postgres.log'
    # `pg_ctl status` é a pergunta certa: a porta pode ainda não estar
    # escutando num servidor que acabou de ser mandado subir, e aí duas
    # partidas se cruzam.
    if ((Executar $PGCTL @('-D', $PGDATA, 'status') 'pg-status') -eq 0) {
      Ok 'já estava no ar'
    } else {
      [void](Executar $PGCTL @('-D', $PGDATA, '-l', $saidaPg, '-w', 'start') 'pg-start')
      if (EsperarPorta $PORTA_BD 40) { Ok } else {
        Falha 'não subiu'
        throw "PostgreSQL não respondeu na porta $PORTA_BD. Veja $saidaPg"
      }
    }
  }

  # -------------------------------------------------------------------
  # 2. Backend
  # -------------------------------------------------------------------
  Passo 'Servidor de aplicação .......'
  LiberarPorta $PORTA_API
  $processos += Servir $BACKEND 'backend'
  if (EsperarResposta "http://localhost:$PORTA_API/health" 90) { Ok } else {
    Falha 'não subiu'
    throw "O backend não respondeu. Veja $LOGS\backend.erro.log"
  }

  # -------------------------------------------------------------------
  # 3. Interface
  # -------------------------------------------------------------------
  Passo 'Interface web ...............'
  LiberarPorta $PORTA_WEB
  $processos += Servir $FRONTEND 'frontend'
  if (EsperarResposta "http://localhost:$PORTA_WEB/" 90) { Ok } else {
    Falha 'não subiu'
    throw "A interface não respondeu. Veja $LOGS\frontend.erro.log"
  }

  # -------------------------------------------------------------------
  # 4. Firewall
  # -------------------------------------------------------------------
  Passo 'Acesso pela rede ............'
  $firewall = GarantirFirewall
  if ($firewall -eq 'liberado') { Ok 'já liberado' }
  elseif ($firewall -eq 'criado') { Ok 'liberado agora' }
  else { Falha 'bloqueado' }

  # -------------------------------------------------------------------
  # 5. O vigia
  #
  # `-WindowStyle Hidden`, e não `-NoNewWindow`: precisa de console
  # próprio. Compartilhando o nosso, o Windows o encerraria junto com a
  # janela — justamente no momento em que ele tem trabalho a fazer.
  # -------------------------------------------------------------------
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$VIGIA`"",
    '-PaiPid', $PID,
    '-PgCtl', "`"$PGCTL`"",
    '-PgData', "`"$PGDATA`"",
    '-PortaWeb', $PORTA_WEB,
    '-PortaApi', $PORTA_API,
    '-PidBackend', $processos[0].Id,
    '-PidFrontend', $processos[1].Id
  ) | Out-Null

  # -------------------------------------------------------------------
  # No ar
  # -------------------------------------------------------------------
  $ip  = IpDaRede
  $url = "http://${ip}:$PORTA_WEB/"

  Escrever ''
  Escrever '   ─────────────────────────────────────────────────────────' 'DarkGray'
  Escrever ''
  Escrever '   NO AR. Link para compartilhar com a equipe:' 'Gray'
  Escrever ''
  Escrever "        $url" 'Cyan'
  Escrever ''
  try {
    Set-Clipboard -Value $url
    Escrever '   (link copiado — é só colar)' 'DarkGray'
  } catch {}
  Escrever ''
  if ($firewall -eq 'recusado') {
    Escrever '   ATENÇÃO: o firewall não foi liberado — o link pode não abrir' 'Yellow'
    Escrever '   para os colegas. Feche e abra de novo, aceitando o aviso do' 'Yellow'
    Escrever '   Windows que pede permissão de administrador.' 'Yellow'
    Escrever ''
  }
  Escrever '   ─────────────────────────────────────────────────────────' 'DarkGray'
  Escrever ''
  Escrever '   FECHE ESTA JANELA para desligar o servidor.' 'Yellow'
  Escrever '   Enquanto ela estiver aberta, o sistema fica online.' 'DarkGray'
  Escrever ''

  try { Start-Process $url | Out-Null } catch {}

  # -------------------------------------------------------------------
  # Fica de pé enquanto os dois servidores viverem
  # -------------------------------------------------------------------
  while ($true) {
    Start-Sleep -Seconds 3
    if ($processos | Where-Object { $_.HasExited }) {
      Escrever ''
      Falha 'Um dos servidores caiu. Veja os registros em servidor\logs.'
      break
    }
  }
} catch {
  Escrever ''
  Escrever "   ERRO: $($_.Exception.Message)" 'Red'
  Escrever ''
  Escrever '   Enter para fechar.' 'DarkGray'
  Read-Host | Out-Null
} finally {
  # Saída pelo Ctrl+C ou pelo fim do laço. Fechando no X, nada disto roda
  # e quem faz o serviço é o vigia.
  Escrever ''
  Escrever '   Desligando…' 'DarkGray'
  # `taskkill /T`: `npm run dev` vira npm.cmd -> cmd.exe -> node, e matar só
  # o npm deixaria o node segurando a porta.
  foreach ($p in $processos) {
    try {
      if (-not $p.HasExited) {
        [void](Executar 'taskkill.exe' @('/PID', $p.Id, '/T', '/F') "taskkill-$($p.Id)")
      }
    } catch {}
  }
  LiberarPorta $PORTA_WEB
  LiberarPorta $PORTA_API
  try { [void](Executar $PGCTL @('-D', $PGDATA, '-m', 'fast', '-w', 'stop') 'pg-stop') } catch {}
  Escrever '   Servidor desligado.' 'DarkGray'
  Escrever ''
  if ($mutex) { try { $mutex.ReleaseMutex() } catch {} }
  Start-Sleep -Seconds 2
}

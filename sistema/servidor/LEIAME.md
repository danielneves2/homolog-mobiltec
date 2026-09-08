# Servidor — ligar e desligar

Atalho no Desktop: **Homologacao Mobiltec**. Um clique sobe tudo; fechar a
janela desliga tudo.

## O que acontece ao clicar

1. **PostgreSQL** — sobe se não estiver no ar (`pg_ctl`, banco em `../pgdata`).
2. **Backend** — `npm run dev` em `../backend`, porta 3001.
3. **Interface** — `npm run dev` em `../frontend`, porta 8080.
4. **Firewall** — cria uma vez a regra que deixa a equipe entrar (pede
   permissão de administrador só nessa primeira vez).
5. **Vigia** — processo escondido que desliga tudo quando a janela some.

No fim aparece o link da rede (`http://<ip>:8080/`), já copiado para a área
de transferência.

## Arquivos

| Arquivo | Papel |
|---|---|
| `Homologacao Mobiltec.cmd` | O que o atalho executa |
| `Iniciar.ps1` | Sobe os serviços e mostra o painel |
| `Vigia.ps1` | Desliga tudo quando a janela é fechada |
| `logs/` | Saída de cada serviço, e o diário do vigia |

## Por que existe o Vigia

Fechar uma janela no **X** encerra o processo sem rodar limpeza nenhuma. Sem
alguém de fora observando, o `node` e o `postgres` continuariam vivos e
invisíveis, segurando as portas — e o próximo clique no atalho encontraria
tudo ocupado.

O Vigia roda escondido, **em console próprio**. Se compartilhasse o console do
`Iniciar`, morreria junto com ele e não teria a quem enterrar.

> Uma primeira versão usava *Job Object* do Windows com `KILL_ON_JOB_CLOSE`,
> que seria o mecanismo natural. Foi descartada por medição: nesta máquina o
> filho fica registrado no job (`IsProcessInJob` = `True`) e **ainda assim
> sobrevive** à morte do pai — o PowerShell já roda dentro de um job, e o
> aninhamento não propaga o encerramento.

## Firewall

A regra criada chama-se **"Homologação Mobiltec (porta 8080)"**:

- vale em **todos os perfis de rede** — a Wi-Fi desta máquina está classificada
  como *Pública*, e uma regra só para *Privada* não pegaria;
- restrita à **sub-rede local** (`LocalSubnet`) — como o perfil é Público e um
  notebook entra em rede de hotel e cafeteria, liberar a porta para qualquer
  origem exporia o sistema fora da empresa.

Para conferir ou remover:

```powershell
Get-NetFirewallRule -DisplayName 'Homologação Mobiltec (porta 8080)'
Remove-NetFirewallRule -DisplayName 'Homologação Mobiltec (porta 8080)'   # precisa de admin
```

## Quando alguma coisa não sobe

O painel diz qual etapa falhou e aponta o registro. Os mais úteis:

- `logs/backend.erro.log` — o servidor de aplicação não respondeu
- `logs/frontend.erro.log` — a interface não respondeu
- `logs/postgres.log` — o banco não abriu
- `logs/vigia.log` — o que foi desligado, e quando

## Cuidados que o script já toma

Três armadilhas do Windows PowerShell 5.1 custaram depuração e estão
resolvidas — mexer aqui sem saber disso reintroduz cada uma:

1. **`.ps1` sem BOM é lido como ANSI.** Os acentos viram lixo. Os dois scripts
   são gravados em UTF-8 **com BOM**.
2. **`Start-Process` não cita argumento com espaço.** A pasta é
   "Homolog Mobiltec"; sem aspas o `pg_ctl` recebe o caminho partido e
   responde "modo de operação desconhecido".
3. **Pipeline de executável nativo trava.** O `postgres` herda a saída padrão
   de quem o criou e mantém o cano aberto para sempre: o `pg_ctl` termina, o
   pipeline não. Por isso todo executável nativo passa por `Start-Process` com
   redirecionamento para arquivo, nunca por `& exe | ...`.

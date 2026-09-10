import process from 'node:process';
import { handleDecisaoCommand } from './decisao.js';
import { handleReviewCommand } from './review.js';
import { runVerify } from './verify.js';

function printHelp(): void {
  console.log(`
🤖 Orquestrador de Agentes — Homologação Mobiltec

Comandos disponíveis:
  npm run agent verify [script]             Executa typecheck backend, lint frontend, build frontend e teste opcional
  npm run agent decisao "<título>" ["just"] Calcula próximo D### e gera linha para sistema/DECISOES.md
  npm run agent review                      Gera .review-prompt.md com git diff e checklist de regras
  npm run agent help                        Exibe esta mensagem de ajuda

Exemplos:
  npm run agent verify                      # Roda tsc backend, oxlint frontend e vite build frontend
  npm run agent verify matriz               # Executa também: npm --prefix sistema/backend run verificar:matriz
  npm run agent decisao "Suporte a WebP"    # Gera D427 com o formato padronizado
  npm run agent review                      # Gera prompt de revisão independente com diff
`);
}

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'verify': {
      const script = args[1];
      const ok = runVerify(script);
      if (!ok) {
        process.exit(1);
      }
      break;
    }

    case 'decisao': {
      const titulo = args[1];
      const justificativa = args[2];
      handleDecisaoCommand(titulo, justificativa);
      break;
    }

    case 'review': {
      handleReviewCommand();
      break;
    }

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;

    default:
      console.error("Comando desconhecido: '" + command + "'");
      printHelp();
      process.exit(1);
  }
}

main();

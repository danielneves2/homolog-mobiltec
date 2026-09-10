import fs from 'node:fs';
import path from 'node:path';

export function findNextDecisionNumber(decisoesContent: string): number {
  const matches = [...decisoesContent.matchAll(/\|\s*D(\d+)\s*\|/g)];
  if (matches.length === 0) {
    return 1;
  }

  const numbers = matches.map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n));
  const max = Math.max(...numbers, 0);
  return max + 1;
}

export function generateDecisionTemplate(
  titulo: string,
  justificativa?: string,
  decisaoPath?: string,
): { id: string; row: string } {
  const targetPath = decisaoPath ?? path.resolve(process.cwd(), 'sistema/DECISOES.md');
  let content = '';
  if (fs.existsSync(targetPath)) {
    content = fs.readFileSync(targetPath, 'utf8');
  }

  const nextNum = findNextDecisionNumber(content);
  const id = 'D' + nextNum;
  const just =
    justificativa && justificativa.trim() !== ''
      ? justificativa.trim()
      : 'Justificativa técnica e contextual do requisito.';
  const row = '| ' + id + ' | ' + titulo.trim() + ' | ' + just + ' |';

  return { id, row };
}

export function handleDecisaoCommand(titulo: string, justificativa?: string): void {
  if (!titulo || titulo.trim() === '') {
    console.error('Uso: npm run agent decisao "<título da decisão>" ["<justificativa>"]');
    process.exit(1);
  }

  const { id, row } = generateDecisionTemplate(titulo, justificativa);
  console.log('\n📋 Próxima Decisão Arquitetural: ' + id + '\n');
  console.log('Linha para adicionar à tabela em sistema/DECISOES.md:');
  console.log('---------------------------------------------------------');
  console.log(row);
  console.log('---------------------------------------------------------\n');
}

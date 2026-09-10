import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function getGitDiff(): string {
  const diff = spawnSync('git', ['diff', 'HEAD'], { encoding: 'utf8' });
  if (diff.status === 0 && diff.stdout && diff.stdout.trim() !== '') {
    return diff.stdout;
  }
  const staged = spawnSync('git', ['diff', '--cached'], { encoding: 'utf8' });
  return staged.stdout ?? '';
}

export function getGitStatus(): string {
  const status = spawnSync('git', ['status', '--short'], { encoding: 'utf8' });
  return status.stdout ?? '';
}

export function generateReviewPrompt(): string {
  const diff = getGitDiff();
  const status = getGitStatus();

  return [
    '# Prompt de Revisão Independente de Código — Homologação Mobiltec',
    '',
    'Você é um revisor sênior de código e arquiteto de software encarregado de revisar as alterações feitas no **Sistema de Homologação Mobiltec**.',
    '',
    'Analise o git diff anexo com base rigorosa no **CLAUDE.md**, **spec-sistema-homologacao.md**, **design-system.md** e **sistema/DECISOES.md**.',
    '',
    '---',
    '',
    '## 1. Arquivos Alterados',
    '\`\`\`',
    status.trim() || 'Nenhum arquivo alterado',
    '\`\`\`',
    '',
    '---',
    '',
    '## 2. Checklist Crítico de Regras Inalienáveis',
    '',
    'Verifique se qualquer uma destas regras fundamentais foi violada:',
    '',
    '- [ ] **Sem botão genérico "Não" (spec §5):** `FALHA` e `NAO_SUPORTADO` são conceitos distintos. A interface NUNCA deve unificá-los.',
    '- [ ] **Justificativa obrigatória (spec §5):** os status `FALHA`, `NAO_SUPORTADO` e `COM_RESSALVA` exigem justificativa. O modal deve abrir **imediatamente** no momento do clique.',
    '- [ ] **Imutabilidade do catálogo:** itens de teste NUNCA são deletados fisicamente do banco (apenas soft delete via `ativo = false`).',
    '- [ ] **Homologações Aprovadas/Publicadas somente-leitura:** alterações requerem fluxo formal de reabertura auditada.',
    '- [ ] **Decisão manual de homologado:** o campo `homologado` NUNCA deve ser inferido automaticamente por contagem de itens OK.',
    '- [ ] **Design System sem Hexadecimal:** nenhum componente React deve usar cores hexadecimais hardcoded (ex: `#6C14D0`). Sempre usar tokens Tailwind 4 (`bg-primary`, `text-brand-purple`, etc.).',
    '- [ ] **Decisões registradas:** se houver escolha técnica ou desvio arquitetural, foi adicionada uma nova decisão em `sistema/DECISOES.md`?',
    '- [ ] **Limpeza de cobaias (D398):** scripts de teste limpam seus dados sem poluir a base real.',
    '',
    '---',
    '',
    '## 3. Git Diff Completo',
    '',
    '\`\`\`diff',
    diff.trim() || 'Nenhum diff detectado contra HEAD.',
    '\`\`\`',
    '',
    '---',
    '',
    '## 4. Instruções ao Revisor',
    '1. Aponte cada problema indicando **arquivo e linha**.',
    '2. Avalie riscos de regressão no gerador de certificados (quebra de página em polegadas, base64 de fotos).',
    '3. Conclua com parecer formal: **APROVADO**, **APROVADO COM RESSALVAS** ou **REPROVADO**.',
  ].join('\n');
}

export function handleReviewCommand(): void {
  const content = generateReviewPrompt();
  const outputPath = path.resolve(process.cwd(), '.review-prompt.md');
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log('\n📄 Prompt de revisão gerado com sucesso em: ' + outputPath);
  console.log('Você pode copiar o conteúdo desse arquivo e colar em uma IA externa (ChatGPT/Claude) para revisão independente.\n');
}

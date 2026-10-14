import { useEffect, useState, type ReactNode } from 'react'
import { LogoMobiltec } from '@/componentes/LogoMobiltec'
import { Icone, type NomeIcone } from '@/componentes/Icone'
import { META_STATUS } from '@/lib/tipos'

/**
 * Guia de uso (D491).
 *
 * Passo a passo para quem homologa pela plataforma — em especial o parceiro.
 * Abre em outra guia a partir do menu, então tem casca própria: barra do topo,
 * trilha de passos à esquerda (acompanha a rolagem) e o conteúdo à direita.
 *
 * Os nomes de botões aqui são os da tela, ao pé da letra. Mudou um rótulo no
 * sistema? Mude aqui também.
 */

interface Passo {
  id: string
  titulo: string
  icone: NomeIcone
}

const PASSOS: Passo[] = [
  { id: 'comece', titulo: 'Comece por aqui', icone: 'home' },
  { id: 'paineis', titulo: 'Os painéis', icone: 'dashboard' },
  { id: 'planilha', titulo: 'A matriz de testes', icone: 'homologacao' },
  { id: 'cadastrar', titulo: 'Cadastrar um modelo', icone: 'registro' },
  { id: 'testar', titulo: 'Registrar os testes', icone: 'lapis' },
  { id: 'enviar', titulo: 'Enviar para validação', icone: 'upload' },
  { id: 'revisao', titulo: 'Revisão e ajustes', icone: 'sino' },
  { id: 'certificado', titulo: 'Certificado', icone: 'certificado' },
  { id: 'reteste', titulo: 'Reteste', icone: 'relogio' },
  { id: 'duvidas', titulo: 'Dúvidas rápidas', icone: 'busca' },
]

export function Guia() {
  const [ativo, setAtivo] = useState(PASSOS[0].id)

  useEffect(() => {
    document.title = 'Guia de uso · Homologação Mobiltec'
  }, [])

  // A trilha acompanha a leitura: o passo ativo é o que está no terço de cima
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas.filter((e) => e.isIntersecting)
        if (visiveis.length > 0) setAtivo(visiveis[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    for (const p of PASSOS) {
      const el = document.getElementById(p.id)
      if (el) observador.observe(el)
    }
    return () => observador.disconnect()
  }, [])

  function irPara(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const indiceAtivo = PASSOS.findIndex((p) => p.id === ativo)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-sidebar)', color: 'var(--color-foreground)' }}>
      {/* Barra do topo */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderColor: 'var(--color-border)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <LogoMobiltec className="h-8 w-auto" />
          <span className="h-5 w-px" style={{ background: 'var(--color-border)' }} />
          <div className="flex min-w-0 items-center gap-2">
            <Icone nome="guia" className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm font-semibold">Guia de uso</span>
          </div>
          <a
            href="/"
            className="ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--color-muted)]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
          >
            Abrir o sistema
          </a>
        </div>
        {/* Progresso de leitura */}
        <div className="h-0.5 w-full" style={{ background: 'var(--color-border)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((indiceAtivo + 1) / PASSOS.length) * 100}%`,
              background: 'var(--gradient-brand-purple)',
            }}
          />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:py-10">
        {/* Trilha de passos */}
        <nav className="hidden w-56 shrink-0 lg:block" aria-label="Passos do guia">
          <div className="sticky top-24">
            <p className="mb-3 px-3 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
              Passo a passo
            </p>
            <ol className="space-y-0.5">
              {PASSOS.map((p, i) => {
                const atual = p.id === ativo
                const lido = i < indiceAtivo
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => irPara(p.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors"
                      style={{
                        background: atual ? 'rgba(126,32,101,0.09)' : 'transparent',
                        color: atual ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                        fontWeight: atual ? 600 : 500,
                      }}
                    >
                      <span
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                        style={{
                          background: atual || lido ? 'var(--gradient-brand-purple)' : 'var(--color-card)',
                          color: atual || lido ? '#fff' : 'var(--color-muted-foreground)',
                          border: atual || lido ? 'none' : '1px solid var(--color-border)',
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate">{p.titulo}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          {/* Trilha compacta no celular/tablet */}
          <div className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
            {PASSOS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => irPara(p.id)}
                className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: p.id === ativo ? 'var(--color-primary)' : 'var(--color-border)',
                  color: p.id === ativo ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                  background: 'var(--color-card)',
                }}
              >
                {i + 1}. {p.titulo}
              </button>
            ))}
          </div>

          <div className="mx-auto max-w-3xl space-y-6">
            {/* 1 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[0]} numero={1}>
              <p>
                Aqui você registra os testes de cada dispositivo contra o MDM da Mobiltec. A equipe
                Mobiltec confere o que você registrou e, aprovado, emite o <strong>certificado de
                homologação</strong>.
              </p>
              <p className="mt-3">O caminho de todo dispositivo é sempre o mesmo:</p>
              <FluxoStatus />
              <Dica>
                Você só edita enquanto o dispositivo está <Chip tipo="rascunho">Em homologação</Chip> ou{' '}
                <Chip tipo="revisao">Em revisão</Chip>. Nos outros momentos ele fica com a Mobiltec e
                aparece somente para leitura.
              </Dica>
            </Secao>

            {/* 2 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[1]} numero={2}>
              <p>No menu, em <Rotulo>Painéis</Rotulo>, há dois painéis:</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Cartao titulo="Painel Mobiltec" icone="home">
                  A vitrine geral. Mostra os modelos <strong>homologados</strong> de toda a plataforma e o
                  que a Mobiltec está testando. É só para consulta. Em cada homologado, o botão{' '}
                  <Botao>Exibir informações</Botao> abre a ficha completa.
                </Cartao>
                <Cartao titulo="Painel da sua empresa" icone="ambiente">
                  O seu espaço de trabalho, com os seus dispositivos e o status de cada um. É aqui que
                  chegam os pedidos de ajuste da Mobiltec e onde ficam os seus certificados.
                </Cartao>
              </div>
              <p className="mt-4">No painel da sua empresa, os filtros separam os dispositivos por etapa:</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                <Chip tipo="neutro">Todos os dispositivos</Chip>
                <Chip tipo="rascunho">Em homologação</Chip>
                <Chip tipo="validacao">Em validação</Chip>
                <Chip tipo="revisao">Em revisão</Chip>
                <Chip tipo="ok">Homologados</Chip>
              </ul>
              <p className="mt-3">
                Em cada card, <Botao>Matriz de testes →</Botao> leva direto à matriz do dispositivo.
              </p>
            </Secao>

            {/* 3 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[2]} numero={3}>
              <p>
                No menu, abra <Rotulo>Matriz de testes</Rotulo> e escolha o tipo de dispositivo (por exemplo,
                Terminal PoS). Você vê só os tipos liberados para a sua empresa.
              </p>
              <ul className="mt-3 space-y-2">
                <Item>
                  <strong>Cada coluna é um modelo.</strong> O ícone ☰ ao lado do nome abre o menu do modelo.
                </Item>
                <Item>
                  <strong>No topo fica a ficha</strong> da unidade testada (foto, IMEI, versões…), e{' '}
                  <strong>abaixo, as baterias</strong> com os itens de teste.
                </Item>
                <Item>
                  Os filtros <Rotulo>Fabricante</Rotulo>, <Rotulo>Modelo</Rotulo>,{' '}
                  <Rotulo>Versão do agente</Rotulo> e <Rotulo>Status</Rotulo> ajudam quando a matriz cresce.
                </Item>
              </ul>
              <Dica>A matriz da sua empresa é só sua: outros parceiros não veem os seus modelos.</Dica>
            </Secao>

            {/* 4 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[3]} numero={4}>
              <Passos>
                <PassoItem>
                  Na matriz, clique em <Botao destaque>+ Novo modelo</Botao>.
                </PassoItem>
                <PassoItem>
                  Preencha o essencial: <strong>Fabricante</strong>, <strong>Modelo</strong>, sistema e
                  versão, <strong>Tipo de agente</strong>, <strong>Versão do agente</strong> e{' '}
                  <strong>Método de inscrição</strong>. Número de série e IMEIs, se tiver em mãos.
                </PassoItem>
                <PassoItem>
                  Clique em <Botao destaque>Cadastrar modelo</Botao>. A coluna nasce com todos os itens em{' '}
                  <em>Não testado</em>, pronta para começar.
                </PassoItem>
              </Passos>
              <Dica>
                Errou algum dado? Pelo menu ☰ da coluna → <Rotulo>Configuração</Rotulo> você corrige,
                enquanto o modelo estiver em homologação.
              </Dica>
            </Secao>

            {/* 5 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[4]} numero={5}>
              <p>
                Clique na célula do item e escolha o resultado. Atalho: tecle o número.
              </p>
              <div className="mt-3 grid gap-2">
                {(Object.keys(META_STATUS) as (keyof typeof META_STATUS)[]).map((st) => (
                  <Resultado key={st} meta={META_STATUS[st]} />
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                <Item>
                  <strong>Observação por item:</strong> na célula, <Rotulo>✎ Observação</Rotulo>. Descreva
                  o que viu e anexe prints ou .zip de logs. Dá para colar print com <Tecla>Ctrl</Tecla>+<Tecla>V</Tecla>.
                </Item>
                <Item>
                  <strong>Observação geral do modelo:</strong> menu ☰ → <Rotulo>Observação</Rotulo> →{' '}
                  <Botao>Adicionar observação</Botao>.
                </Item>
                <Item>
                  <strong>Ficha:</strong> clique no campo para editar; <Tecla>Enter</Tecla> salva e{' '}
                  <Tecla>Esc</Tecla> cancela. A foto entra em <Rotulo>+ foto</Rotulo> (PNG, JPEG ou WebP, até 8 MB).
                </Item>
              </ul>
              <Dica>
                Tudo é salvo na hora, sem botão de salvar. A <strong>justificativa técnica</strong> de cada
                divergência é escrita pela Mobiltec a partir das suas observações. Por isso, capriche nelas.
              </Dica>
              <p className="mt-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Anexos: imagens PNG, JPEG ou WebP e arquivos .zip, até 50 MB. Vídeos não são aceitos.
              </p>
            </Secao>

            {/* 6 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[5]} numero={6}>
              <Passos>
                <PassoItem>
                  Terminou os testes? No menu ☰ da coluna, clique em{' '}
                  <Botao destaque>Enviar para Validação</Botao>.
                </PassoItem>
                <PassoItem>
                  Se quiser aparecer no certificado como apoio técnico, marque{' '}
                  <Rotulo>Cadastrar como Apoio do Parceiro</Rotulo>.
                </PassoItem>
                <PassoItem>
                  Confirme em <Botao destaque>Enviar para Validação Mobiltec</Botao>. O status passa para{' '}
                  <Chip tipo="validacao">Em validação</Chip> e a coluna fica somente para leitura.
                </PassoItem>
              </Passos>
              <Dica>
                Se ainda houver itens <em>Não testado</em>, o sistema avisa, mas não impede o envio.
                Confira antes de enviar.
              </Dica>
            </Secao>

            {/* 7 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[6]} numero={7}>
              <p>
                Se a Mobiltec precisar de algum ajuste, o dispositivo volta para você como{' '}
                <Chip tipo="revisao">Em revisão</Chip>, com o motivo escrito.
              </p>
              <Passos>
                <PassoItem>
                  Você é avisado no sino <Icone nome="sino" className="inline h-3.5 w-3.5 align-[-2px]" /> do
                  topo e no card do dispositivo, no painel da sua empresa.
                </PassoItem>
                <PassoItem>
                  Leia o apontamento e clique em <Botao>✓ Confirmar recebimento (Ciente)</Botao>, para a
                  Mobiltec saber que você viu.
                </PassoItem>
                <PassoItem>
                  Clique em <Botao>Ajustar</Botao>, corrija o que foi pedido na matriz e, no menu ☰ da
                  coluna, use <Botao destaque>Reenviar para Validação</Botao>.
                </PassoItem>
              </Passos>
            </Secao>

            {/* 8 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[7]} numero={8}>
              <p>
                Aprovado, o dispositivo fica <Chip tipo="ok">Homologado</Chip> e você recebe um aviso no
                sino. O certificado fica disponível em três lugares:
              </p>
              <ul className="mt-3 space-y-2">
                <Item>
                  no card do dispositivo, no painel da sua empresa: <Botao>Certificado</Botao>;
                </Item>
                <Item>
                  no menu ☰ da coluna, na matriz: <Rotulo>Certificado</Rotulo>;
                </Item>
                <Item>
                  no próprio aviso do sino: <Rotulo>Acessar →</Rotulo>.
                </Item>
              </ul>
              <p className="mt-3">
                Na tela do certificado, <Botao destaque>Baixar Certificado</Botao> gera o PDF. A ficha técnica
                do fabricante, quando cadastrada, sai em <Botao>Exportar Datasheet</Botao>, dentro de{' '}
                <Rotulo>Exibir informações</Rotulo> no Painel Mobiltec.
              </p>
            </Secao>

            {/* 9 ------------------------------------------------------------ */}
            <Secao passo={PASSOS[8]} numero={9}>
              <p>
                Saiu uma nova versão do agente? Teste de novo sem perder o histórico: menu ☰ da coluna →{' '}
                <Rotulo>Reteste</Rotulo>. Informe a <strong>Nova versão do agente</strong> e clique em{' '}
                <Botao destaque>Abrir reteste</Botao>.
              </p>
              <Dica>
                A homologação anterior continua guardada. A coluna passa a mostrar o reteste, do zero.
              </Dica>
            </Secao>

            {/* 10 ----------------------------------------------------------- */}
            <Secao passo={PASSOS[9]} numero={10}>
              <div className="space-y-2">
                <Pergunta q="Não consigo editar a matriz.">
                  O dispositivo está com a Mobiltec (<em>Em validação</em>) ou já foi finalizado. Você só
                  edita em <em>Em homologação</em> ou <em>Em revisão</em>.
                </Pergunta>
                <Pergunta q="Não vejo um tipo de dispositivo no menu.">
                  O acesso é liberado por tipo. Peça à Mobiltec para incluir o tipo na sua conta.
                </Pergunta>
                <Pergunta q="Cadastrei um modelo por engano.">
                  Menu ☰ da coluna → <Rotulo>Remover da planilha</Rotulo>. Vale enquanto ele não foi
                  finalizado e só para quem o cadastrou.
                </Pergunta>
                <Pergunta q="Onde escrevo a justificativa de uma falha?">
                  A justificativa oficial é escrita pela Mobiltec. Registre tudo na observação do item, com
                  prints e logs, que ela é a base da justificativa.
                </Pergunta>
                <Pergunta q="O certificado está bloqueado.">
                  Ele é liberado só depois da aprovação da Mobiltec. Até lá, a tela mostra o status atual.
                </Pergunta>
              </div>
            </Secao>

            <p className="pb-10 pt-2 text-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Ficou alguma dúvida? Fale com a equipe de homologação da Mobiltec.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

// ============================================================
// Peças do guia
// ============================================================

function Secao({ passo, numero, children }: { passo: Passo; numero: number; children: ReactNode }) {
  return (
    <section
      id={passo.id}
      className="scroll-mt-24 rounded-xl border p-5 sm:p-6"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
          style={{ background: 'var(--gradient-brand-purple)', boxShadow: '0 2px 6px -1px rgba(126,32,101,0.35)' }}
        >
          <Icone nome={passo.icone} className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
            Passo {numero}
          </p>
          <h2 className="text-lg font-semibold leading-tight">{passo.titulo}</h2>
        </div>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
        {children}
      </div>
    </section>
  )
}

/** Fluxo de status com setas: o mapa mental do processo */
function FluxoStatus() {
  return (
    <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Chip tipo="rascunho">Em homologação</Chip>
        <Seta />
        <Chip tipo="validacao">Em validação</Chip>
        <Seta />
        <Chip tipo="ok">Homologado</Chip>
      </div>
      <p className="mt-2.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        <strong style={{ color: '#b45309' }}>↺ Em revisão:</strong> se a Mobiltec pedir ajustes, o dispositivo
        volta para você, você corrige e reenvia.
      </p>
      <ol className="mt-3 grid gap-1.5 text-xs sm:grid-cols-3" style={{ color: 'var(--color-muted-foreground)' }}>
        <li><strong style={{ color: 'var(--color-foreground)' }}>Você</strong> cadastra o modelo e testa.</li>
        <li><strong style={{ color: 'var(--color-foreground)' }}>Mobiltec</strong> confere e valida.</li>
        <li><strong style={{ color: 'var(--color-foreground)' }}>Certificado</strong> liberado para download.</li>
      </ol>
    </div>
  )
}

function Seta() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden>
      <path d="M3 8h9M9 4.5 12.5 8 9 11.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const CORES_CHIP = {
  rascunho: { bg: '#f1f5f9', fg: '#475569' },
  validacao: { bg: 'rgba(126,32,101,0.08)', fg: 'var(--color-primary)' },
  revisao: { bg: '#fef3c7', fg: '#b45309' },
  ok: { bg: '#f0fdf4', fg: '#15803d' },
  neutro: { bg: 'var(--color-muted)', fg: 'var(--color-muted-foreground)' },
} as const

function Chip({ tipo, children }: { tipo: keyof typeof CORES_CHIP; children: ReactNode }) {
  const c = CORES_CHIP[tipo]
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold align-middle"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  )
}

/** Imitação visual de um botão do sistema */
function Botao({ children, destaque }: { children: ReactNode; destaque?: boolean }) {
  return (
    <span
      className="mx-0.5 inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold align-middle"
      style={
        destaque
          ? { background: 'var(--gradient-brand-purple)', color: '#fff' }
          : { background: 'var(--color-card)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }
      }
    >
      {children}
    </span>
  )
}

/** Nome de menu, filtro ou opção da tela */
function Rotulo({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap font-semibold" style={{ color: 'var(--color-primary)' }}>
      {children}
    </span>
  )
}

function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="mx-0.5 rounded border px-1.5 py-px font-mono text-[11px]"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}
    >
      {children}
    </kbd>
  )
}

function Dica({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-4 flex gap-2.5 rounded-lg px-3.5 py-3 text-[13px] leading-relaxed"
      style={{ background: 'var(--color-info-soft)', color: 'var(--color-info-fg)' }}
    >
      <span className="mt-0.5 shrink-0 text-[11px] font-bold uppercase tracking-wider">Dica</span>
      <span>{children}</span>
    </div>
  )
}

function Cartao({ titulo, icone, children }: { titulo: string; icone: NomeIcone; children: ReactNode }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Icone nome={icone} className="h-4 w-4" />
        {titulo}
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
        {children}
      </p>
    </div>
  )
}

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-primary)' }} />
      <span>{children}</span>
    </li>
  )
}

function Passos({ children }: { children: ReactNode }) {
  return <ol className="guia-passos mt-3 space-y-3">{children}</ol>
}

function PassoItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="guia-passo-n grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold"
        style={{ background: 'rgba(126,32,101,0.1)', color: 'var(--color-primary)' }}
      />
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

function Resultado({ meta }: { meta: (typeof META_STATUS)[keyof typeof META_STATUS] }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
      <Tecla>{meta.atalho}</Tecla>
      <span
        className="w-28 shrink-0 rounded px-2 py-0.5 text-center text-[11.5px] font-semibold"
        style={{ background: meta.corSoft, color: meta.cor }}
      >
        {meta.rotulo}
      </span>
      <span className="text-[12.5px]" style={{ color: 'var(--color-muted-foreground)' }}>
        {meta.descricao}
      </span>
    </div>
  )
}

function Pergunta({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        {q}
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden>
          <path d="M4 6.5 8 10.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
        {children}
      </p>
    </details>
  )
}

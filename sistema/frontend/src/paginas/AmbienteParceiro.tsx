import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contextos/AuthContext'
import { useAmbiente, useAlterarColaborador, useConvidarColaborador, useSalvarMatrizesOcultas } from '@/hooks/useAmbiente'
import { ErroApi } from '@/lib/api'
import { Icone, iconeDaCategoria } from '@/componentes/Icone'
import { LoadingTela } from '@/componentes/LoadingTela'

/**
 * Configuração do ambiente do parceiro (D500).
 *
 * Só aparece para quem a Mobiltec marcou como "Administrador do ambiente" em
 * Registrar parceiro. Duas coisas: quais matrizes de teste a empresa vê no menu
 * (o Painel Mobiltec continua mostrando todos os aprovados) e quem da empresa
 * tem acesso — convite com senha definida e e-mail do mesmo domínio.
 */
export function AmbienteParceiro() {
  const { podeConfigurarAmbiente, recarregarUsuario } = useAuth()
  const { data, isLoading, error } = useAmbiente(podeConfigurarAmbiente)
  const [modalMatrizes, setModalMatrizes] = useState(false)
  const [modalConvite, setModalConvite] = useState(false)
  const alterar = useAlterarColaborador()

  if (!podeConfigurarAmbiente) return <Navigate to="/paineis/meu-painel" replace />
  if (isLoading) return <LoadingTela mensagem="Carregando o ambiente…" />
  if (error || !data) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--color-destructive)' }}>
        Não foi possível carregar a configuração do ambiente.
      </div>
    )
  }

  const visiveis = data.categorias.filter((c) => !c.oculta).length
  const ativos = data.colaboradores.filter((c) => c.ativo).length

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
      <header>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
          Configurar ambiente · {data.empresa}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          O que a sua empresa vê no menu e quem tem acesso ao ambiente.
        </p>
      </header>

      {/* ---------------- Matrizes de teste ---------------- */}
      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
              <Icone nome="homologacao" className="h-4 w-4" />
              Matrizes de teste
            </h2>
            <p className="mt-1 max-w-xl text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Escolha quais tipos de dispositivo aparecem no menu e na matriz de testes da empresa. Ocultar não apaga
              nada e pode ser desfeito a qualquer momento; o Painel Mobiltec segue mostrando todos os aprovados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalMatrizes(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            <Icone nome="olho" className="h-4 w-4" />
            Personalizar matrizes
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {data.categorias.map((c) => (
            <span
              key={c.slug}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
              style={{
                borderColor: c.oculta ? 'var(--color-border)' : 'var(--color-brand-purple-border)',
                background: c.oculta ? 'var(--color-muted)' : 'var(--color-brand-purple-soft)',
                color: c.oculta ? 'var(--color-muted-foreground)' : 'var(--color-brand-purple-fg)',
                textDecoration: c.oculta ? 'line-through' : 'none',
              }}
            >
              <Icone nome={iconeDaCategoria(c.icone)} className="h-3.5 w-3.5" />
              {c.nome}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
          {visiveis} de {data.categorias.length} matrizes visíveis
        </p>
      </section>

      {/* ---------------- Colaboradores ---------------- */}
      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
              <Icone nome="parceiros" className="h-4 w-4" />
              Colaboradores
            </h2>
            <p className="mt-1 max-w-xl text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Convide pessoas da sua empresa (e-mail @{data.dominio}). Elas entram com a visão padrão de parceiro e veem as
              matrizes que você deixou visíveis.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalConvite(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)', color: 'var(--color-primary)' }}
          >
            <span className="text-sm font-bold leading-none">+</span>
            Convidar colaborador
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full border-collapse text-left text-xs">
            <thead style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
              <tr className="text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-4 py-2.5">Nome</th>
                <th className="px-4 py-2.5">E-mail</th>
                <th className="px-4 py-2.5">Perfil</th>
                <th className="px-4 py-2.5">Situação</th>
                <th className="px-4 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.colaboradores.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {c.nome}
                    {c.voce && (
                      <span className="ml-1.5 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                        (você)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    {c.email}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: c.podeConfigurarAmbiente ? 'var(--color-primary)' : 'var(--color-foreground)' }}>
                    {c.podeConfigurarAmbiente ? 'Administrador do ambiente' : 'Colaborador'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: c.ativo ? 'var(--color-success-soft)' : 'var(--color-muted)',
                        color: c.ativo ? 'var(--color-success-fg)' : 'var(--color-muted-foreground)',
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: c.ativo ? 'var(--color-success)' : 'var(--color-muted-foreground)' }}
                      />
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!c.voce && !c.podeConfigurarAmbiente && (
                      <button
                        type="button"
                        disabled={alterar.isPending}
                        onClick={() => alterar.mutate({ id: c.id, ativo: !c.ativo })}
                        className="text-xs font-semibold hover:underline disabled:opacity-50"
                        style={{ color: c.ativo ? 'var(--color-destructive)' : 'var(--color-primary)' }}
                      >
                        {c.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
          {ativos} {ativos === 1 ? 'pessoa ativa' : 'pessoas ativas'} no ambiente
        </p>
      </section>

      {modalMatrizes && (
        <ModalMatrizes
          categorias={data.categorias}
          aoFechar={() => setModalMatrizes(false)}
          aoSalvar={async () => {
            // O menu lê as matrizes do usuário em sessão: relê para refletir já
            await recarregarUsuario()
            setModalMatrizes(false)
          }}
        />
      )}
      {modalConvite && <ModalConvite dominio={data.dominio} aoFechar={() => setModalConvite(false)} />}
    </div>
  )
}

// ============================================================
// Popup: matrizes com o olhinho de visível/oculta
// ============================================================
function ModalMatrizes({
  categorias,
  aoFechar,
  aoSalvar,
}: {
  categorias: { slug: string; nome: string; icone: string; oculta: boolean }[]
  aoFechar: () => void
  aoSalvar: () => Promise<void>
}) {
  const [ocultas, setOcultas] = useState<Set<string>>(() => new Set(categorias.filter((c) => c.oculta).map((c) => c.slug)))
  const salvar = useSalvarMatrizesOcultas()
  const [erro, setErro] = useState<string | null>(null)
  const mudou = useMemo(
    () => categorias.some((c) => c.oculta !== ocultas.has(c.slug)),
    [categorias, ocultas],
  )

  function alternar(slug: string) {
    setOcultas((prev) => {
      const prox = new Set(prev)
      if (prox.has(slug)) prox.delete(slug)
      else prox.add(slug)
      return prox
    })
  }

  async function confirmar() {
    setErro(null)
    try {
      await salvar.mutateAsync([...ocultas])
      await aoSalvar()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.')
    }
  }

  return (
    <Modal titulo="Personalizar matrizes" subtitulo="Clique no olho para mostrar ou ocultar a matriz no menu da empresa." aoFechar={aoFechar}>
      <ul className="divide-y rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        {categorias.map((c) => {
          const oculta = ocultas.has(c.slug)
          return (
            <li key={c.slug} className="flex items-center justify-between gap-3 px-3.5 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
              <span
                className="flex min-w-0 items-center gap-2.5 text-sm"
                style={{ color: oculta ? 'var(--color-muted-foreground)' : 'var(--color-foreground)' }}
              >
                <Icone nome={iconeDaCategoria(c.icone)} className="h-4 w-4 shrink-0" />
                <span className="truncate">{c.nome}</span>
                {oculta && (
                  <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                    · oculta
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => alternar(c.slug)}
                aria-pressed={!oculta}
                aria-label={oculta ? `Mostrar ${c.nome}` : `Ocultar ${c.nome}`}
                title={oculta ? 'Mostrar no menu' : 'Ocultar do menu'}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors"
                style={{
                  borderColor: oculta ? 'var(--color-border)' : 'var(--color-brand-purple-border)',
                  background: oculta ? 'var(--color-muted)' : 'var(--color-brand-purple-soft)',
                  color: oculta ? 'var(--color-muted-foreground)' : 'var(--color-primary)',
                }}
              >
                <Icone nome={oculta ? 'olho-fechado' : 'olho'} className="h-4 w-4" />
              </button>
            </li>
          )
        })}
      </ul>
      {erro && (
        <p className="mt-3 text-xs" style={{ color: 'var(--color-destructive)' }}>
          {erro}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-lg border px-3.5 py-2 text-xs font-semibold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!mudou || salvar.isPending}
          onClick={confirmar}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </Modal>
  )
}

// ============================================================
// Popup: convite de colaborador (senha definida, mesmo domínio)
// ============================================================
function ModalConvite({ dominio, aoFechar }: { dominio: string; aoFechar: () => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState<string | null>(null)
  const convidar = useConvidarColaborador()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    const mail = email.trim().toLowerCase()
    if (mail.split('@')[1] !== dominio) {
      setErro(`O e-mail precisa ser do domínio da empresa (@${dominio}).`)
      return
    }
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    try {
      await convidar.mutateAsync({ nome: nome.trim(), email: mail, senha })
      setEnviado(mail)
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível convidar.')
    }
  }

  const campo = 'w-full rounded-lg border bg-transparent px-3 py-2 text-sm focus:outline-none'

  return (
    <Modal titulo="Convidar colaborador" subtitulo={`Somente e-mails @${dominio}.`} aoFechar={aoFechar}>
      {enviado ? (
        <div className="space-y-4">
          <p className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-success-soft)', color: 'var(--color-success-fg)' }}>
            Acesso criado para <strong>{enviado}</strong>. Envie o e-mail e a senha definida para a pessoa entrar.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={aoFechar}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            >
              Concluir
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-3">
          <div>
            <label className="label-caps mb-1.5 block" htmlFor="conv-nome">Nome</label>
            <input id="conv-nome" required value={nome} onChange={(e) => setNome(e.target.value)} className={campo} style={{ borderColor: 'var(--color-input)' }} />
          </div>
          <div>
            <label className="label-caps mb-1.5 block" htmlFor="conv-email">E-mail</label>
            <input
              id="conv-email"
              type="email"
              required
              value={email}
              placeholder={`nome@${dominio}`}
              onChange={(e) => setEmail(e.target.value)}
              className={campo}
              style={{ borderColor: 'var(--color-input)' }}
            />
          </div>
          <div>
            <label className="label-caps mb-1.5 block" htmlFor="conv-senha">Senha inicial</label>
            <input
              id="conv-senha"
              type="text"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={campo}
              style={{ borderColor: 'var(--color-input)' }}
            />
            <p className="mt-1.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Mínimo de 6 caracteres. Repasse à pessoa junto com o e-mail.
            </p>
          </div>
          {erro && (
            <p className="text-xs" style={{ color: 'var(--color-destructive)' }}>
              {erro}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              className="rounded-lg border px-3.5 py-2 text-xs font-semibold"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={convidar.isPending}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            >
              {convidar.isPending ? 'Convidando…' : 'Convidar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// ============================================================
// Casca de popup (fecha só pelo X, D434)
// ============================================================
function Modal({
  titulo,
  subtitulo,
  aoFechar,
  children,
}: {
  titulo: string
  subtitulo?: string
  aoFechar: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border p-6 shadow-2xl"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--color-foreground)' }}>
              {titulo}
            </h2>
            {subtitulo && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {subtitulo}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded p-1 hover:opacity-70"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            <Icone nome="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pt-4">{children}</div>
      </div>
    </div>
  )
}

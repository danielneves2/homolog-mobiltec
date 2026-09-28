import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useHomologacao } from '@/hooks/useHomologacao'
import { api, ErroApi } from '@/lib/api'
import { useAuth } from '@/contextos/AuthContext'
import { gerarNomeArquivoCertificado } from '@/lib/imprimir'
import { obterDatasheetDispositivo } from '@/lib/datasheets'
import { baixarPdfDireto } from '@/lib/gerarPdfClient'
import { ModalUploadFoto } from '@/componentes/dispositivo/ModalUploadFoto'
import {
  FichaUnidadeTestada,
  ResultadoHomologacao,
} from '@/componentes/homologacao/FichaHomologacao'
import { AvisoRevisao } from '@/componentes/homologacao/AvisoRevisao'
import { Icone } from '@/componentes/Icone'
import { LoadingTela } from '@/componentes/LoadingTela'


/**
 * Informações da homologação de um modelo.
 *
 * É o "exibir informações" do catálogo: a ficha da unidade testada, o
 * resultado item a item, as observações do parceiro e o botão de exportar o
 * certificado. Só leitura — quem edita é a matriz.
 *
 * A ficha propriamente dita mora em `FichaHomologacao` (D432): a tela de
 * Validar Certificado abre a mesma coisa num modal, e duas cópias do mesmo
 * documento divergiriam na primeira mudança.
 */
export function DetalheDispositivo() {
  const { id = '' } = useParams<{ id: string }>()
  const consulta = useHomologacao(id)
  const { usuario, ehMobiltec, ehParceiro } = useAuth()

  const [baixando, setBaixando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [modalFotoAberto, setModalFotoAberto] = useState(false)

  const homologacao = consulta.data

  const parceiroAtribuido =
    ehParceiro &&
    usuario !== null &&
    (homologacao?.responsavelId === usuario.id || homologacao?.apoioId === usuario.id)
  const homologacaoEditavelPeloParceiro =
    homologacao?.status === 'RASCUNHO' || homologacao?.status === 'EM_REVISAO'
  const podeEditarFoto =
    ehMobiltec || (parceiroAtribuido && homologacaoEditavelPeloParceiro)

  // O apontamento em aberto, quando a homologação está esperando ajuste. É o
  // que diz ao parceiro o que a Mobiltec pediu (D435).
  const revisao =
    homologacao?.status === 'EM_REVISAO'
      ? homologacao.historicoStatus?.find((h) => h.statusNovo === 'EM_REVISAO')
      : undefined

  const nomeArquivo = gerarNomeArquivoCertificado(homologacao?.dispositivo, id)
  const tituloDocumento = nomeArquivo.replace(/\.pdf$/i, '')

  useEffect(() => {
    if (homologacao?.dispositivo) {
      document.title = tituloDocumento
    }
    return () => {
      document.title = 'Homologação · Mobiltec'
    }
  }, [tituloDocumento, homologacao?.dispositivo])

  const datasheet = obterDatasheetDispositivo(homologacao?.dispositivo)

  function baixarDatasheet() {
    if (!datasheet) return
    const a = document.createElement('a')
    a.href = datasheet.url
    a.download = datasheet.nomeDownload
    a.click()
  }

  async function exportarCertificado() {
    setBaixando(true)
    setAviso(null)
    try {
      try {
        const blob = await api.getBlob(`/homologacoes/${id}/certificado/pdf?ambiente=mobiltec`)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = nomeArquivo
        a.click()
        URL.revokeObjectURL(url)
        setAviso('Certificado baixado com sucesso!')
        setTimeout(() => setAviso(null), 3500)
        return
      } catch {
        // Fallback automático client-side (Vercel serverless sem Playwright)
      }

      setAviso('Gerando arquivo PDF para download…')
      const html = await api.getTexto(`/homologacoes/${id}/certificado/preview?ambiente=mobiltec`)
      await baixarPdfDireto(html, nomeArquivo)
      setAviso('Certificado baixado com sucesso!')
      setTimeout(() => setAviso(null), 3500)
    } catch (e: any) {
      setAviso(e instanceof ErroApi ? e.message : 'Não foi possível gerar o PDF.')
    } finally {
      setBaixando(false)
    }
  }

  if (consulta.isLoading) {
    return <LoadingTela mensagem="Carregando detalhes do dispositivo…" />
  }

  if (!homologacao) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: 'var(--color-destructive)' }}>
          {consulta.error instanceof ErroApi
            ? consulta.error.message
            : 'Homologação não encontrada.'}
        </p>
        <Link
          to="/"
          className="mt-3 inline-block text-sm underline underline-offset-2"
          style={{ color: 'var(--color-primary)' }}
        >
          Voltar para dispositivos
        </Link>
      </div>
    )
  }

  const fabricante = homologacao.dispositivo?.fabricante ?? '—'
  const modelo = homologacao.dispositivo?.modelo ?? '—'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-7">
        <Link
          to="/"
          className="text-sm underline underline-offset-2"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          ← Painel de Homologação
        </Link>

        {aviso && (
          <div
            role="status"
            className="mt-3 rounded-lg px-4 py-3 text-sm flex items-center gap-2 border transition-all"
            style={
              aviso.toLowerCase().includes('sucesso')
                ? {
                    background: 'var(--color-success-soft, #e6f9f0)',
                    color: 'var(--color-success-fg, #0d7045)',
                    borderColor: 'var(--color-success-border, #a3e6cb)',
                  }
                : aviso.toLowerCase().includes('gerando')
                  ? {
                      background: 'var(--color-brand-purple-soft)',
                      color: 'var(--color-brand-purple-fg)',
                      borderColor: 'var(--color-brand-purple-border)',
                    }
                  : {
                      background: 'var(--color-destructive-soft)',
                      color: 'var(--color-destructive-fg)',
                      borderColor: 'var(--color-destructive-soft)',
                    }
            }
          >
            <Icone
              nome={aviso.toLowerCase().includes('sucesso') ? 'homologacao' : 'baixar'}
              className={`h-4 w-4 shrink-0 ${aviso.toLowerCase().includes('gerando') ? 'animate-bounce' : ''}`}
            />
            <span>{aviso}</span>
          </div>
        )}

        {revisao && (
          <div className="mt-3">
            <AvisoRevisao
              motivo={revisao.motivo}
              solicitadoEm={revisao.criadoEm}
              solicitadoPor={revisao.usuario?.nome}
              comoAgir={ehParceiro}
            />
          </div>
        )}

        {/* Ficha da unidade testada — a identificação do modelo e a ação
            moram no topo dela, e não num bloco solto acima: é a mesma coisa
            sendo descrita, não duas. */}
        <section
          className="mt-4 rounded-xl border px-5 pb-5 pt-3"
          style={{ background: 'var(--color-card)' }}
        >
          {/* Cabeçalho na largura inteira do card: a linha divisória passa a
              atravessar tudo, e o que fica abaixo dela — foto e dados — é um
              bloco só, contra o qual a foto pode se centralizar de verdade. */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-2.5">
            {/* h2: o h1 da página é a trilha da barra do card, no Layout */}
            <h2
              className="min-w-0 text-sm font-medium uppercase"
              style={{ color: 'var(--color-muted-foreground)', letterSpacing: '0.06em' }}
            >
              {fabricante} {modelo}
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={baixarDatasheet}
                disabled={!datasheet}
                title={datasheet ? `Baixar datasheet de ${datasheet.nomeDownload}` : 'Datasheet não disponível para este modelo'}
                className="flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <Icone nome="anexo" className="h-4 w-4 shrink-0" />
                Exportar Datasheet
              </button>
              <button
                type="button"
                onClick={exportarCertificado}
                disabled={baixando}
                title="Baixar o certificado em PDF"
                className="flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
                style={{ background: 'var(--gradient-brand-purple)' }}
              >
                <Icone nome="baixar" className="h-4 w-4 shrink-0" />
                {baixando ? 'Gerando…' : 'Baixar Certificado'}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <FichaUnidadeTestada
              homologacao={homologacao}
              aoEditarFoto={podeEditarFoto ? () => setModalFotoAberto(true) : undefined}
            />
          </div>
        </section>

        <ResultadoHomologacao homologacao={homologacao} />
      </div>

      {modalFotoAberto && homologacao.dispositivo?.id && (
        <ModalUploadFoto
          aberto={modalFotoAberto}
          aoFechar={() => setModalFotoAberto(false)}
          dispositivoId={homologacao.dispositivo.id}
          homologacaoId={id}
          nomeDispositivo={`${fabricante} ${modelo}`}
          fotoAtualUrl={homologacao.dispositivo.fotoUrl ?? null}
        />
      )}
    </div>
  )
}

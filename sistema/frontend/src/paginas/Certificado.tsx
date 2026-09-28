import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contextos/AuthContext'
import { api, ErroApi } from '@/lib/api'
import { gerarNomeArquivoCertificado } from '@/lib/imprimir'
import { baixarPdfDireto } from '@/lib/gerarPdfClient'
import {
  useDashboard,
  useEditarDivergencia,
  useHomologacao,
  useSalvarDadosCertificado,
} from '@/hooks/useHomologacao'
import { PainelFontesAssinaturas } from '@/componentes/certificado/PainelFontesAssinaturas'
import {
  ModalEditarTexto,
  type EdicaoCertificado,
} from '@/componentes/certificado/ModalEditarTexto'
import { ROTULO_STATUS_HOMOLOGACAO, ehSomenteLeitura } from '@/lib/tipos'
import { LoadingTela } from '@/componentes/LoadingTela'
import { Icone } from '@/componentes/Icone'

interface CertificadoEmitido {
  id: string
  formato: 'PDF' | 'PPTX'
  arquivoUrl: string
  emitidoEm: string
  usuario: { nome: string }
}

/**
 * Preview e exportação do certificado (spec §10.6).
 *
 * Para Parceiros: liberado apenas após aprovação formal pela Mobiltec. Edição bloqueada.
 */
export function Certificado() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { usuario, ehParceiro } = useAuth()
  const { data: homologacao } = useHomologacao(id)
  const { data: dashboard } = useDashboard(id)
  const [baixando, setBaixando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const paramAmbiente = searchParams.get('ambiente')
  const ambiente: 'parceiro' | 'mobiltec' =
    paramAmbiente === 'parceiro' ? 'parceiro' : (paramAmbiente === 'mobiltec' ? 'mobiltec' : (ehParceiro ? 'parceiro' : 'mobiltec'))

  const editarDivergencia = useEditarDivergencia(id)
  const salvarDados = useSalvarDadosCertificado(id)
  const [edicao, setEdicao] = useState<EdicaoCertificado | null>(null)

  const estaAprovado = homologacao?.status === 'APROVADO' || homologacao?.status === 'PUBLICADO'
  const podeVerCertificado = !ehParceiro || estaAprovado
  const somenteLeitura = ehParceiro || (homologacao ? ehSomenteLeitura(homologacao.status, usuario?.papel) : false)

  const { data: html, isLoading, isError, error } = useQuery({
    queryKey: ['certificado', id, 'preview', somenteLeitura, podeVerCertificado, ambiente],
    enabled: podeVerCertificado,
    queryFn: () =>
      api.getTexto(
        // Os lápis só entram no preview editável — o PDF nunca os recebe.
        `/homologacoes/${id}/certificado/preview?ambiente=${ambiente}${somenteLeitura ? '' : '&editavel=1'}`,
      ),
  })

  // O preview roda num iframe srcDoc (mesma origem) e avisa por postMessage
  // qual texto o usuário quer editar.
  useEffect(() => {
    function aoReceber(e: MessageEvent) {
      const d = e.data
      if (d?.fonte !== 'certificado') return
      setEdicao({ tipo: d.tipo, chave: d.chave ?? '', textoAtual: d.textoAtual ?? '' })
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [])

  function salvarEdicao(texto: string) {
    if (!edicao) return
    const aoTerminar = {
      onSuccess: () => setEdicao(null),
      onError: (e: unknown) =>
        setAviso(e instanceof ErroApi ? e.message : 'Não foi possível salvar o texto.'),
    }

    if (edicao.tipo === 'divergencia') {
      editarDivergencia.mutate(
        { itemIds: edicao.chave.split(',').filter(Boolean), texto },
        aoTerminar,
      )
    } else {
      salvarDados.mutate({ [edicao.tipo]: texto.trim() || null }, aoTerminar)
    }
  }

  const { data: emitidos } = useQuery({
    queryKey: ['certificado', id, 'emitidos'],
    queryFn: () => api.get<CertificadoEmitido[]>(`/homologacoes/${id}/certificados`),
  })

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

  async function baixarPdf() {
    setBaixando(true)
    setAviso(null)
    try {
      try {
        const blob = await api.getBlob(`/homologacoes/${id}/certificado/pdf?ambiente=${ambiente}`)
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
      const htmlParaPdf = html || (await api.getTexto(`/homologacoes/${id}/certificado/preview?ambiente=${ambiente}`))
      await baixarPdfDireto(htmlParaPdf, nomeArquivo)
      setAviso('Certificado baixado com sucesso!')
      setTimeout(() => setAviso(null), 3500)
    } catch (e: any) {
      setAviso(e instanceof ErroApi ? e.message : 'Não foi possível gerar o PDF.')
    } finally {
      setBaixando(false)
    }
  }

  const naoTestados = dashboard?.contagem.naoTestado ?? 0
  // Divergência sem justificativa também sai em branco do documento
  const semJustificativa = (homologacao?.resultados ?? []).filter(
    (r) =>
      ['FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA'].includes(r.status) &&
      !r.justificativaTexto?.trim() &&
      !r.justificativa?.texto?.trim(),
  ).length
  const pendentes = naoTestados + semJustificativa

  return (
    <div className="h-screen flex flex-col">
      <header className="px-6 py-3 border-b flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link to="/matriz" className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              ←
            </Link>
            <h1 className="text-lg font-semibold truncate">
              Certificado · {homologacao?.dispositivo?.nomeComercial ?? '…'}
            </h1>
            {homologacao && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                {ROTULO_STATUS_HOMOLOGACAO[homologacao.status]}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Gerado a partir dos dados atuais — atualiza junto com a matriz.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!ehParceiro && (
            <div className="flex items-center rounded-lg border p-0.5 text-xs font-medium" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setSearchParams({ ambiente: 'mobiltec' })}
                className={`px-2.5 py-1 rounded-md transition-colors ${ambiente === 'mobiltec' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-muted-foreground)] hover:text-foreground'}`}
              >
                Padrão Mobiltec
              </button>
              <button
                type="button"
                onClick={() => setSearchParams({ ambiente: 'parceiro' })}
                className={`px-2.5 py-1 rounded-md transition-colors ${ambiente === 'parceiro' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-muted-foreground)] hover:text-foreground'}`}
              >
                Visão Parceiro
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={baixarPdf}
            disabled={baixando || (ehParceiro && !estaAprovado)}
            title={ehParceiro && !estaAprovado ? 'Download disponível apenas após aprovação formal pela Mobiltec' : undefined}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--gradient-brand-purple)' }}
          >
            <Icone nome="baixar" className="h-4 w-4 shrink-0" />
            {baixando ? 'Gerando…' : 'Baixar Certificado'}
          </button>
        </div>
      </header>

      {ehParceiro && !estaAprovado && (
        <div
          className="mx-6 mt-3 px-4 py-3 rounded-md text-sm shrink-0 font-medium"
          style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning-fg)' }}
        >
          Atenção: A visualização e o download do certificado oficial são liberados apenas após a aprovação formal da homologação pela equipe Mobiltec.
        </div>
      )}

      {pendentes > 0 && !ehParceiro && (
        <div
          className="mx-6 mt-3 px-4 py-2.5 rounded-md text-sm shrink-0"
          style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning-fg)' }}
        >
          <strong>{pendentes} item(ns) saem em branco no certificado.</strong>{' '}
          {[
            naoTestados > 0 && `${naoTestados} não testado(s)`,
            semJustificativa > 0 && `${semJustificativa} com divergência mas sem justificativa`,
          ]
            .filter(Boolean)
            .join(' e ')}
          . O documento só afirma o que foi avaliado e explicado — preencha a justificativa para
          o status aparecer.
        </div>
      )}

      {aviso && (
        <div
          role="alert"
          className="mx-6 mt-3 px-4 py-2.5 rounded-md text-sm shrink-0 border transition-all"
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
          <div className="flex items-center gap-2">
            <Icone
              nome={aviso.toLowerCase().includes('sucesso') ? 'homologacao' : 'baixar'}
              className={`h-4 w-4 shrink-0 ${aviso.toLowerCase().includes('gerando') ? 'animate-bounce' : ''}`}
            />
            <span>{aviso}</span>
          </div>
        </div>
      )}

      {emitidos && emitidos.length > 0 && (
        <div className="mx-6 mt-3 text-xs shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
          Emissões arquivadas:{' '}
          {emitidos.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ' · '}
              <a
                href={c.arquivoUrl.startsWith('http') ? c.arquivoUrl : `/api${c.arquivoUrl}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {new Date(c.emitidoEm).toLocaleString('pt-BR')} ({c.usuario.nome})
              </a>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Fontes e assinaturas são exclusivas do fluxo técnico administrativo */}
        {!ehParceiro && (
          <aside
            className="w-72 shrink-0 border-r overflow-y-auto p-5"
            style={{ background: 'var(--color-card)' }}
          >
            {homologacao ? (
              <PainelFontesAssinaturas homologacao={homologacao} somenteLeitura={somenteLeitura} />
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Carregando…
              </p>
            )}
          </aside>
        )}

        {!podeVerCertificado ? (
          <div className="flex-1 flex items-center justify-center p-8" style={{ background: '#F4F4F5' }}>
            <div className="max-w-md text-center p-8 rounded-xl border shadow-sm" style={{ background: 'var(--color-card)' }}>
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-base font-semibold mb-2">Certificado em Validação</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                Este dispositivo está com status <strong>{homologacao ? ROTULO_STATUS_HOMOLOGACAO[homologacao.status] : '…'}</strong>.
                O documento oficial e o download em PDF estarão disponíveis nesta tela assim que a equipe técnica da Mobiltec concluir a análise e aprovar o equipamento.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6" style={{ background: '#DDD9DE' }}>
            {isLoading && (
              <div className="py-12">
                <LoadingTela mensagem="Gerando visualização do certificado técnico…" />
              </div>
            )}
            {isError && (
              <p className="text-sm text-center" style={{ color: 'var(--color-destructive)' }}>
                {error instanceof ErroApi ? error.message : 'Não foi possível gerar o preview.'}
              </p>
            )}
            {html && (
              <>
                {!somenteLeitura && (
                  <p
                    className="text-xs text-center mb-3 mx-auto"
                    style={{ color: 'var(--color-muted-foreground)', maxWidth: 900 }}
                  >
                    Clique no <span style={{ color: 'var(--color-primary)' }}>✎</span> ao lado de um
                    texto para editá-lo. Os botões não saem no PDF.
                  </p>
                )}
                <iframe
                  title="Preview do certificado"
                  srcDoc={html}
                  className="w-full border-0 mx-auto block"
                  style={{ height: '100%', minHeight: '80vh', maxWidth: 900 }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {edicao && (
        <ModalEditarTexto
          edicao={edicao}
          salvando={editarDivergencia.isPending || salvarDados.isPending}
          aoSalvar={salvarEdicao}
          aoFechar={() => setEdicao(null)}
        />
      )}
    </div>
  )
}

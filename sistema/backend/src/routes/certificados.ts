/**
 * Certificado (spec §8).
 *
 * GET  /homologacoes/:id/certificado/preview → HTML vivo, sempre com os dados
 *      atuais da homologação. É o que o front mostra no iframe: mexeu na
 *      matriz, o preview reflete na hora.
 * GET  /homologacoes/:id/certificado/pdf     → renderiza o mesmo HTML em PDF
 * POST /homologacoes/:id/certificados        → EMITE: grava o arquivo e o
 *      snapshot JSON. Certificado emitido é imutável (spec §11.3)
 * GET  /homologacoes/:id/certificados        → histórico de emissões
 */
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  analiseComoBlocos,
  gerarCertificadoHtml,
  lerAnaliseManual,
  type HomologacaoCertificado,
} from '../services/certificado.js'

const INCLUDE_CERTIFICADO = {
  dispositivo: true,
  responsavel: { select: { nome: true } },
  gerente: { select: { nome: true } },
  apoio: { select: { nome: true } },
  resultados: {
    include: {
      item: true,
      justificativa: true,
    },
  },
} as const

const certificadoRoutes: FastifyPluginAsync = async (fastify) => {

  /**
   * Carrega a homologação para o certificado.
   *
   * Enquanto ela está aberta, o documento segue a bateria do tipo — a mesma
   * regra da planilha: tirar um item da configuração tira a linha das duas,
   * senão a tela e o documento contariam coisas diferentes.
   *
   * Fechada, não. Homologação aprovada é registro: o que foi atestado ali não
   * muda porque alguém editou o tipo depois. (Certificado já emitido é arquivo
   * em disco com snapshot próprio, e não passa por aqui.)
   */
  async function carregar(id: string) {
    const h = await fastify.prisma.homologacao.findUnique({
      where: { id },
      include: INCLUDE_CERTIFICADO,
    })
    if (!h) return h

    const congelada = h.status === 'APROVADO' || h.status === 'PUBLICADO'
    if (congelada) return h

    const daBateria = await fastify.prisma.bateriaItem.findMany({
      where: { bateriaId: h.bateriaId },
      select: { itemId: true },
    })
    const naBateria = new Set(daBateria.map((b) => b.itemId))
    h.resultados = h.resultados.filter((r) => naBateria.has(r.itemId))
    return h
  }

  /** Renderiza o HTML em PDF A4 com o Playwright (§8.4) */
  async function renderizarPdf(html: string): Promise<Buffer> {
    // Import dinâmico: o Playwright é pesado e só é necessário na emissão.
    const { chromium } = await import('playwright')
    const navegador = await chromium.launch()
    try {
      const pagina = await navegador.newPage()
      await pagina.setContent(html, { waitUntil: 'networkidle' })
      return await pagina.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
    } finally {
      await navegador.close()
    }
  }

  // ============================================================
  // GET preview — HTML vivo
  // ============================================================
  fastify.get('/homologacoes/:id/certificado/preview', {
    onRequest: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { editavel } = request.query as { editavel?: string }
    const h = await carregar(id)
    if (!h) return reply.status(404).send({ erro: 'Homologação não encontrada' })

    return reply
      .type('text/html; charset=utf-8')
      .send(
        gerarCertificadoHtml(h as unknown as HomologacaoCertificado, {
          editavel: editavel === '1',
        }),
      )
  })

  // ============================================================
  // PUT texto de divergência — edição pelo lápis do preview
  // Grava `justificativaTexto` como override (spec §4.2) nos resultados que
  // compartilham o parágrafo, sem tocar na justificativa da biblioteca.
  // ============================================================
  fastify.put('/homologacoes/:id/certificado/divergencia', {
    onRequest: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { itemIds, texto } = z
      .object({
        itemIds: z.array(z.string().uuid()).min(1),
        texto: z.string().min(1).max(4000),
      })
      .parse(request.body)

    const h = await fastify.prisma.homologacao.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!h) return reply.status(404).send({ erro: 'Homologação não encontrada' })
    if (h.status === 'APROVADO' || h.status === 'PUBLICADO') {
      return reply.status(403).send({ erro: 'Homologação aprovada é somente leitura. Reabra para editar.' })
    }

    const { count } = await fastify.prisma.resultado.updateMany({
      where: { homologacaoId: id, itemId: { in: itemIds } },
      data: { justificativaTexto: texto.trim() },
    })

    return { atualizados: count }
  })

  // ============================================================
  // Análise das Divergências escrita à mão
  //
  // A seção nasce das justificativas, mas o certificado é de um modelo
  // específico e às vezes precisa de um tema que nenhuma justificativa cobre.
  // Aqui o técnico assume a seção inteira: edita e apaga até os blocos que
  // vieram por padrão, acrescenta os seus, e volta ao automático quando quiser.
  // ============================================================
  fastify.get('/homologacoes/:id/certificado/analise', {
    onRequest: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const h = await carregar(id)
    if (!h) return reply.status(404).send({ erro: 'Homologação não encontrada' })

    const manual = lerAnaliseManual(h.analiseDivergencias)
    const automaticos = analiseComoBlocos(h.resultados)

    // O que a planilha ganhou depois que a seção foi assumida: justificativa
    // que ainda não passou por aqui. Parágrafo reescrito ou apagado de
    // propósito não volta — o texto original dele está em `vistos`.
    const jaTratados = new Set([
      ...(manual?.vistos ?? []),
      ...(manual?.blocos ?? []).map((b) => b.texto),
    ])
    const novas = manual ? automaticos.filter((a) => a.texto && !jaTratados.has(a.texto)) : []

    // Justificativa marcada como tratada que não virou bloco nenhum. Ou foi
    // apagada de propósito, ou se perdeu — e o "Reconferir" do painel existe
    // para o técnico decidir qual dos dois, sem que o sistema adivinhe.
    const noBloco = new Set((manual?.blocos ?? []).map((b) => b.texto))
    const foraDoDocumento = manual
      ? automaticos.filter((a) => a.texto && !noBloco.has(a.texto)).length
      : 0

    return {
      manual: manual !== null,
      // Sem versão manual, devolve a automática: é o ponto de partida da
      // edição, e o painel mostra o mesmo que o documento já traz
      blocos: manual?.blocos ?? automaticos,
      vistos: manual?.vistos ?? [],
      novas,
      foraDoDocumento,
      somenteLeitura: h.status === 'APROVADO' || h.status === 'PUBLICADO',
    }
  })

  fastify.put('/homologacoes/:id/certificado/analise', {
    onRequest: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { blocos, vistos } = z
      .object({
        // `null` devolve a seção ao automático
        blocos: z
          .array(
            z.object({
              id: z.string().min(1).max(64),
              titulo: z.string().max(200).default(''),
              subtitulo: z.string().max(400).default(''),
              texto: z.string().max(4000).default(''),
            }),
          )
          .nullable(),
        /** Justificativas que o técnico já decidiu o que fazer com */
        vistos: z.array(z.string().max(4000)).optional(),
      })
      .parse(request.body)

    const h = await carregar(id)
    if (!h) return reply.status(404).send({ erro: 'Homologação não encontrada' })
    if (h.status === 'APROVADO' || h.status === 'PUBLICADO') {
      return reply.status(403).send({ erro: 'Homologação aprovada é somente leitura. Reabra para editar.' })
    }

    // `vistos` só muda por gesto explícito do técnico — assumir a seção,
    // trazer uma justificativa ou dispensá-la —, e por isso vem do cliente.
    //
    // A primeira versão recalculava aqui, marcando como tratada toda
    // justificativa que existisse no momento do salvamento. O efeito foi
    // engolir em silêncio justificativas escritas na planilha entre uma
    // edição e outra: elas nunca viravam bloco e nunca mais eram oferecidas.
    const anterior = lerAnaliseManual(h.analiseDivergencias)
    const marcados = [...new Set(vistos ?? anterior?.vistos ?? [])].filter(Boolean)

    await fastify.prisma.homologacao.update({
      where: { id },
      data: { analiseDivergencias: blocos ? { blocos, vistos: marcados } : Prisma.DbNull },
    })

    return { manual: blocos !== null, blocos: blocos ?? [] }
  })

  // ============================================================
  // GET pdf — sem gravar nada
  // ============================================================
  fastify.get('/homologacoes/:id/certificado/pdf', {
    onRequest: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const h = await carregar(id)
    if (!h) return reply.status(404).send({ erro: 'Homologação não encontrada' })

    const pdf = await renderizarPdf(gerarCertificadoHtml(h as unknown as HomologacaoCertificado))
    // O S/N saiu do nome do arquivo junto com o corpo do documento: o nome
    // viaja com o PDF e vazaria o identificador do aparelho do mesmo jeito.
    // Fabricante + modelo + versão do agente já distinguem um do outro.
    const nome = `certificado-${h.dispositivo.fabricante}-${h.dispositivo.modelo}-agente-${h.versaoAgente}.pdf`.replace(
      /[^\w.-]/g,
      '_',
    )

    return reply
      .type('application/pdf')
      .header('Content-Disposition', `inline; filename="${nome}"`)
      .send(pdf)
  })

  // ============================================================
  // POST — emite e arquiva (imutável)
  // ============================================================
  fastify.post('/homologacoes/:id/certificados', {
    onRequest: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { formato } = z
      .object({ formato: z.enum(['PDF', 'PPTX']).default('PDF') })
      .parse(request.body ?? {})

    if (formato === 'PPTX') {
      return reply.status(501).send({
        erro: 'Exportação PPTX ainda não implementada — é Fase 2 do roadmap. Use PDF.',
      })
    }

    const h = await carregar(id)
    if (!h) return reply.status(404).send({ erro: 'Homologação não encontrada' })

    // Os dois casos que saem em branco do documento (ver `renderStatus`)
    const naoTestados = h.resultados.filter(r => r.status === 'NAO_TESTADO').length
    const semJustificativa = h.resultados.filter(
      r =>
        ['FALHA', 'NAO_SUPORTADO', 'COM_RESSALVA'].includes(r.status) &&
        !r.justificativaTexto?.trim() &&
        !r.justificativa?.texto?.trim(),
    ).length
    const pendentes = naoTestados + semJustificativa
    const html = gerarCertificadoHtml(h as unknown as HomologacaoCertificado)
    const pdf = await renderizarPdf(html)

    const dir = path.resolve(process.env.UPLOAD_DIR ?? './uploads', 'certificados')
    await mkdir(dir, { recursive: true })

    const nomeArquivo = `${id}-${Date.now()}.pdf`
    await writeFile(path.join(dir, nomeArquivo), pdf)

    // Snapshot dos dados no momento da emissão — o cliente pode pedir
    // reemissão idêntica anos depois (spec §4.2 / §11.3).
    const certificado = await fastify.prisma.certificadoEmitido.create({
      data: {
        homologacaoId: id,
        formato: 'PDF',
        arquivoUrl: `/uploads/certificados/${nomeArquivo}`,
        snapshot: JSON.parse(JSON.stringify(h)),
        emitidoPor: request.user.id,
      },
      include: { usuario: { select: { nome: true } } },
    })

    return reply.status(201).send({
      ...certificado,
      // A emissão não é bloqueada por pendências, mas o front precisa avisar (§10.6)
      aviso: pendentes > 0
        ? [
            naoTestados > 0 && `${naoTestados} não testado(s)`,
            semJustificativa > 0 && `${semJustificativa} divergência(s) sem justificativa`,
          ]
            .filter(Boolean)
            .join(' e ') + ' saíram em branco no certificado.'
        : null,
    })
  })

  // ============================================================
  // GET — histórico de emissões
  // ============================================================
  fastify.get('/homologacoes/:id/certificados', {
    onRequest: [fastify.autenticar],
  }, async (request) => {
    const { id } = request.params as { id: string }
    return fastify.prisma.certificadoEmitido.findMany({
      where: { homologacaoId: id },
      select: {
        id: true,
        formato: true,
        arquivoUrl: true,
        emitidoEm: true,
        usuario: { select: { nome: true } },
      },
      orderBy: { emitidoEm: 'desc' },
    })
  })
}

export default certificadoRoutes

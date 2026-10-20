/**
 * Configuração do ambiente do parceiro (D500)
 *
 * GET   /ambiente                      → matrizes liberadas (com flag de oculta) e colaboradores
 * PUT   /ambiente/categorias-ocultas   → oculta/exibe matrizes no menu e na matriz da empresa
 * POST  /ambiente/colaboradores        → convida colaborador da mesma empresa (senha definida)
 * PATCH /ambiente/colaboradores/:id    → ativa/desativa um colaborador
 *
 * Só o parceiro com `podeConfigurarAmbiente` (marcado pela Mobiltec em Registrar
 * parceiro) altera algo; tudo vale apenas dentro da própria empresa. Ocultar uma
 * matriz não apaga dado e não mexe no Painel Mobiltec, que segue mostrando todos
 * os aprovados (D498/D499).
 */
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { chaveAmbiente, slugsOcultosAmbiente } from '../lib/escopo.js'

interface AdminAmbiente {
  id: string
  email: string
  empresa: string
  dominio: string
}

const dominioDe = (email: string) => email.split('@')[1]?.trim().toLowerCase() ?? ''

const ambienteRoutes: FastifyPluginAsync = async (fastify) => {
  /** Parceiro logado, com empresa; `exigirAdmin` exige a permissão de configurar */
  async function carregarParceiro(
    request: FastifyRequest,
    reply: FastifyReply,
    exigirAdmin: boolean,
  ): Promise<(AdminAmbiente & { podeConfigurar: boolean }) | null> {
    if (request.user.papel !== 'PARCEIRO') {
      reply.status(403).send({ erro: 'A configuração de ambiente é exclusiva de parceiros' })
      return null
    }
    const u = await fastify.prisma.usuario.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, empresa: true, podeConfigurarAmbiente: true, dominioCorporativo: true },
    })
    const empresa = u?.empresa?.trim()
    if (!u || !empresa) {
      reply.status(403).send({ erro: 'Usuário sem empresa vinculada' })
      return null
    }
    if (exigirAdmin && !u.podeConfigurarAmbiente) {
      reply.status(403).send({ erro: 'Sem permissão para configurar o ambiente da empresa' })
      return null
    }
    return {
      id: u.id,
      email: u.email,
      empresa,
      dominio: (u.dominioCorporativo ?? dominioDe(u.email)).toLowerCase(),
      podeConfigurar: u.podeConfigurarAmbiente,
    }
  }

  const selectColaborador = {
    id: true,
    nome: true,
    email: true,
    ativo: true,
    podeConfigurarAmbiente: true,
    criadoEm: true,
  } as const

  // ============================================================
  // GET /ambiente
  // ============================================================
  fastify.get('/ambiente', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const p = await carregarParceiro(request, reply, false)
    if (!p) return

    const [categorias, ocultas] = await Promise.all([
      fastify.prisma.categoria.findMany({
        where: { ativo: true, liberadaParceiros: true },
        orderBy: { ordem: 'asc' },
        select: { slug: true, nome: true, icone: true },
      }),
      slugsOcultosAmbiente(fastify.prisma, p.empresa),
    ])
    const oc = new Set(ocultas)

    const colaboradores = p.podeConfigurar
      ? await fastify.prisma.usuario.findMany({
          where: { papel: 'PARCEIRO', empresa: { equals: p.empresa, mode: 'insensitive' } },
          select: selectColaborador,
          orderBy: { criadoEm: 'asc' },
        })
      : []

    return {
      empresa: p.empresa,
      dominio: p.dominio,
      podeConfigurar: p.podeConfigurar,
      categorias: categorias.map((c) => ({ ...c, oculta: oc.has(c.slug) })),
      colaboradores: colaboradores.map((c) => ({ ...c, voce: c.id === p.id })),
    }
  })

  // ============================================================
  // PUT /ambiente/categorias-ocultas
  // ============================================================
  fastify.put('/ambiente/categorias-ocultas', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const p = await carregarParceiro(request, reply, true)
    if (!p) return
    const body = z.object({ ocultas: z.array(z.string().min(1).max(80)).max(200) }).parse(request.body)

    // Só faz sentido ocultar o que está liberado; slug desconhecido é ignorado
    const liberadas = await fastify.prisma.categoria.findMany({
      where: { liberadaParceiros: true },
      select: { slug: true },
    })
    const validas = new Set(liberadas.map((c) => c.slug))
    const ocultas = [...new Set(body.ocultas)].filter((s) => validas.has(s))

    const chave = chaveAmbiente(p.empresa)!
    await fastify.prisma.ambienteParceiro.upsert({
      where: { empresa: chave },
      create: { empresa: chave, categoriasOcultas: ocultas, atualizadoPorId: p.id },
      update: { categoriasOcultas: ocultas, atualizadoPorId: p.id },
    })
    return { ocultas }
  })

  // ============================================================
  // POST /ambiente/colaboradores — convite com senha definida
  // ============================================================
  fastify.post('/ambiente/colaboradores', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const p = await carregarParceiro(request, reply, true)
    if (!p) return
    const body = z
      .object({
        nome: z.string().trim().min(2, 'Informe o nome do colaborador').max(120),
        email: z.string().trim().email('E-mail inválido'),
        senha: z.string().min(4, 'A senha deve ter no mínimo 4 caracteres').max(120),
      })
      .parse(request.body)

    const email = body.email.toLowerCase()
    if (!p.dominio || dominioDe(email) !== p.dominio) {
      return reply.status(422).send({
        erro: `O e-mail precisa ser do domínio da empresa (@${p.dominio})`,
        campo: 'email',
      })
    }

    const existente = await fastify.prisma.usuario.findUnique({ where: { email }, select: { id: true } })
    if (existente) {
      return reply.status(409).send({ erro: 'Já existe um usuário cadastrado com este e-mail', campo: 'email' })
    }

    const colaborador = await fastify.prisma.usuario.create({
      data: {
        nome: body.nome,
        email,
        cargo: 'Parceiro Homologador',
        senhaHash: await bcrypt.hash(body.senha, 10),
        papel: 'PARCEIRO',
        empresa: p.empresa,
        dominioCorporativo: p.dominio,
        podeConfigurarAmbiente: false,
        ativo: true,
      },
      select: selectColaborador,
    })
    return reply.status(201).send({ ...colaborador, voce: false })
  })

  // ============================================================
  // PATCH /ambiente/colaboradores/:id — ativar/desativar
  // ============================================================
  fastify.patch('/ambiente/colaboradores/:id', { onRequest: [fastify.autenticar] }, async (request, reply) => {
    const p = await carregarParceiro(request, reply, true)
    if (!p) return
    const { id } = request.params as { id: string }
    const body = z.object({ ativo: z.boolean() }).parse(request.body)

    if (id === p.id) {
      return reply.status(422).send({ erro: 'Você não pode desativar o próprio acesso' })
    }
    const alvo = await fastify.prisma.usuario.findFirst({
      where: { id, papel: 'PARCEIRO', empresa: { equals: p.empresa, mode: 'insensitive' } },
      select: { id: true, podeConfigurarAmbiente: true },
    })
    if (!alvo) return reply.status(404).send({ erro: 'Colaborador não encontrado nesta empresa' })
    if (alvo.podeConfigurarAmbiente) {
      return reply.status(422).send({ erro: 'Administradores do ambiente são gerenciados pela Mobiltec' })
    }

    const atualizado = await fastify.prisma.usuario.update({
      where: { id },
      data: { ativo: body.ativo },
      select: selectColaborador,
    })
    return { ...atualizado, voce: false }
  })
}

export default ambienteRoutes

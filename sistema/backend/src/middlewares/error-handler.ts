/**
 * Handler de erro global.
 *
 * Sem ele, um payload que reprova no Zod vira 500 com corpo vazio — o front não
 * consegue distinguir "você digitou errado" de "o servidor caiu".
 *
 * Contrato de erro do sistema (todas as rotas usam a chave `erro`):
 *   { erro: string, campos?: [{ campo, mensagem }] }
 */
import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function registrarErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((erro: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Validação de entrada (Zod)
    if (erro instanceof ZodError) {
      return reply.status(400).send({
        erro: 'Dados inválidos.',
        campos: erro.issues.map(i => ({
          campo: i.path.join('.') || '(raiz)',
          mensagem: i.message,
        })),
      })
    }

    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      switch (erro.code) {
        case 'P2002': {
          // Unique violation — ex.: (fabricante, modelo) duplicado
          const alvo = (erro.meta?.target as string[] | undefined)?.join(', ')
          return reply.status(409).send({
            erro: alvo
              ? `Já existe um registro com esse valor de ${alvo}.`
              : 'Já existe um registro com esses dados.',
          })
        }
        case 'P2025':
          // Update/delete em id inexistente
          return reply.status(404).send({ erro: 'Registro não encontrado.' })
        case 'P2003':
          return reply.status(400).send({ erro: 'Referência inválida: o registro relacionado não existe.' })
      }
    }

    // Erros que o próprio Fastify já classificou (payload malformado, 404 de rota…)
    if (erro.statusCode && erro.statusCode < 500) {
      return reply.status(erro.statusCode).send({ erro: erro.message })
    }

    // Só chega aqui o que é realmente inesperado — logar completo
    request.log.error({ err: erro }, 'Erro não tratado')
    return reply.status(500).send({ erro: 'Erro interno do servidor.' })
  })
}

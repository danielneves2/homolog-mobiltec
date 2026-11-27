import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { FormularioTipo } from '@/componentes/tipo/FormularioTipo'
import { ResumoDaEdicao } from '@/componentes/tipo/ResumoDaEdicao'
import { useTiposDispositivo } from '@/hooks/useTipoDispositivo'
import type { ResumoEdicao } from '@/hooks/useTipoDispositivo'
import { LoadingTela } from '@/componentes/LoadingTela'

/**
 * Registrar um tipo de dispositivo — e, com `:id` na rota, editar um existente.
 *
 * O formulário é o mesmo nos dois casos (`FormularioTipo`); esta tela só decide
 * qual tipo entregar a ele.
 *
 * Editando, salvar NÃO fecha a tela (D531): quem ajusta a planilha de um tipo
 * costuma fazer várias mudanças seguidas. O formulário recarrega com o que
 * ficou gravado e o aviso de "salvo" aparece no topo.
 */
export function RegistroDispositivo() {
  const { id } = useParams<{ id: string }>()
  const { data: tipos, isLoading, refetch } = useTiposDispositivo()
  const [versao, setVersao] = useState(0)
  const [recado, setRecado] = useState<{ resumo: ResumoEdicao; nome: string } | null>(null)

  if (!id) return <FormularioTipo />

  if (isLoading) {
    return <LoadingTela mensagem="Carregando dados do tipo de dispositivo…" />
  }

  const tipo = tipos?.find((t) => t.id === id)
  if (!tipo) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--color-destructive-fg)' }}>
        Tipo de dispositivo não encontrado.
      </div>
    )
  }

  // `key`: trocar de tipo pela URL precisa remontar o formulário, senão o
  // estado do anterior continua nos campos. A `versao` remonta depois de
  // salvar, com o que voltou do banco (itens novos já com id, nomes gravados).
  return (
    <FormularioTipo
      key={`${tipo.id}-${versao}`}
      tipo={tipo}
      aviso={
        recado && (
          <ResumoDaEdicao nome={recado.nome} resumo={recado.resumo} aoFechar={() => setRecado(null)} />
        )
      }
      aoSalvar={async (resumo, nome) => {
        await refetch()
        setRecado({ resumo, nome })
        setVersao((v) => v + 1)
      }}
    />
  )
}

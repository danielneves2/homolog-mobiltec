import { useParams } from 'react-router-dom'
import { FormularioTipo } from '@/componentes/tipo/FormularioTipo'
import { useTiposDispositivo } from '@/hooks/useTipoDispositivo'

/**
 * Registrar um tipo de dispositivo — e, com `:id` na rota, editar um existente.
 *
 * O formulário é o mesmo nos dois casos (`FormularioTipo`); esta tela só decide
 * qual tipo entregar a ele.
 */
export function RegistroDispositivo() {
  const { id } = useParams<{ id: string }>()
  const { data: tipos, isLoading } = useTiposDispositivo()

  if (!id) return <FormularioTipo />

  if (isLoading) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        Carregando o tipo…
      </div>
    )
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
  // estado do anterior continua nos campos.
  return <FormularioTipo key={tipo.id} tipo={tipo} />
}

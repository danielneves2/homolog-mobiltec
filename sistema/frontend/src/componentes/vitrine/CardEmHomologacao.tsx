import { Link } from 'react-router-dom'
import { useAuth } from '@/contextos/AuthContext'
import { CabecalhoModelo, DadosModelo } from '@/componentes/vitrine/ResumoModelo'
import { rotuloVersao } from '@/lib/tipos'
import type { DispositivoVitrine } from '@/lib/tipos'

/**
 * Prévia de um modelo em teste no Painel Mobiltec.
 *
 * Mesmo visual do card do painel do parceiro (D513), sem o rodapé de ações.
 * Mostra só o andamento — quantos itens já foram avaliados — e nunca o
 * resultado item a item: enquanto a homologação não é finalizada, um
 * "não suportado" ainda pode virar outra coisa depois da revisão técnica.
 *
 * Só a Mobiltec clica para abrir a matriz do modelo. No Painel Mobiltec o
 * parceiro está consultando a vitrine: o card é informativo e não leva a
 * lugar nenhum — a matriz dele mora no painel da própria empresa (D512).
 */
export function CardEmHomologacao({ dispositivo: d }: { dispositivo: DispositivoVitrine }) {
  const { ehParceiro } = useAuth()

  const conteudo = (
    <>
      <CabecalhoModelo
        fabricante={d.fabricante}
        categoriaNome={d.categoriaNome}
        nomeComercial={d.nomeComercial}
        status={d.status}
        reteste={d.numeroHomologacao > 1}
      />
      <DadosModelo
        fotoUrl={d.fotoUrl}
        nomeComercial={d.nomeComercial}
        versaoSo={d.versaoSo}
        versaoAgente={d.versaoAgente}
        gerenciamento={d.gerenciamento}
        avaliados={d.resumo.avaliados}
        total={d.resumo.total}
        homologado={d.homologado}
        numeroHomologacao={d.numeroHomologacao}
        versaoVigente={d.vigente && rotuloVersao({ ...d.vigente, gerenciamento: d.gerenciamento })}
      />
    </>
  )

  const classe = 'flex flex-col rounded-xl border shadow-xs overflow-hidden'

  if (ehParceiro) {
    return (
      <article className={classe} style={{ background: 'var(--color-card)' }} data-em-homologacao={d.nomeComercial}>
        {conteudo}
      </article>
    )
  }

  return (
    <Link
      to={`/matriz/${d.categoriaSlug}`}
      className={`${classe} transition-shadow hover:shadow-md`}
      style={{ background: 'var(--color-card)' }}
      data-em-homologacao={d.nomeComercial}
    >
      {conteudo}
    </Link>
  )
}

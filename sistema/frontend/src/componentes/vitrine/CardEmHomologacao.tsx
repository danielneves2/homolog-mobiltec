import { Link } from 'react-router-dom'
import { somenteVersaoAndroid } from '@/lib/tipos'
import type { DispositivoVitrine } from '@/lib/tipos'

/**
 * Prévia de um modelo em teste.
 *
 * Mostra só o andamento — quantos itens já foram avaliados — e nunca o
 * resultado item a item: enquanto a homologação não é finalizada, um
 * "não suportado" ainda pode virar outra coisa depois da revisão técnica.
 */
export function CardEmHomologacao({ dispositivo: d }: { dispositivo: DispositivoVitrine }) {
  const { avaliados, total } = d.resumo
  const progresso = total > 0 ? Math.round((avaliados / total) * 100) : 0

  return (
    <Link
      to={`/matriz/${d.categoriaSlug}`}
      className="block rounded-xl border p-4 shadow-xs transition-shadow hover:shadow-md"
      style={{ background: 'var(--color-card)' }}
      data-em-homologacao={d.nomeComercial}
    >
      <div className="min-w-0">
        <p
          className="text-xs font-medium uppercase"
          style={{ color: 'var(--color-muted-foreground)', letterSpacing: '0.06em' }}
        >
          {d.fabricante}
        </p>
        <h3 className="truncate text-sm font-semibold" title={d.nomeComercial}>
          {d.nomeComercial}
        </h3>
      </div>

      <p className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        Agente {d.versaoAgente} · Android {somenteVersaoAndroid(d.versaoSo)}
        {d.numeroHomologacao > 1 && ` · ${d.numeroHomologacao}ª homologação`}
      </p>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span style={{ color: 'var(--color-muted-foreground)' }}>
            {avaliados} de {total} itens avaliados
          </span>
          <span className="font-semibold">{progresso}%</span>
        </div>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--color-muted)' }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progresso}%`, background: 'var(--color-primary)' }}
          />
        </div>
      </div>
    </Link>
  )
}

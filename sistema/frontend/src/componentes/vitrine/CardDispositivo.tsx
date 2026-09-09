import { Link } from 'react-router-dom'
import { somenteVersaoAndroid } from '@/lib/tipos'
import type { DispositivoVitrine } from '@/lib/tipos'
import { FotoDispositivo } from './FotoDispositivo'
import { BadgeHomologado } from '@/componentes/comum/BadgeHomologado'

/**
 * Card de um modelo homologado.
 *
 * A identidade vem no topo e a foto desce sobre a linha divisória, numa
 * pastilha própria: separa o "quem é" do "como se comporta" sem precisar de
 * mais texto, e deixa a foto respirar num card que é sobretudo informação.
 */
export function CardDispositivo({ dispositivo: d }: { dispositivo: DispositivoVitrine }) {
  const aprovado = d.homologado

  return (
    <article
      // Hover só na sombra: a borda fica quieta, o card apenas ganha
      // profundidade. Sem cor entrando e saindo a cada passagem do mouse.
      className="flex flex-col overflow-hidden rounded-xl border shadow-xs transition-shadow duration-200 hover:shadow-lg"
      style={{ background: 'var(--color-card)' }}
      data-modelo={d.nomeComercial}
    >
      {/* Identificação e veredito ao lado da foto. O `pt` menor e o `pb`
          maior sobem os dois sem mexer na altura do bloco — e é a altura do
          bloco que define onde fica a divisória, e com ela a foto. */}
      {/* `items-start` alinha o selo com a primeira linha do título (o
          fabricante); com `items-end` ele descia para a linha do modelo.

          O `pb-11` não é folga decorativa: a foto sobe 43px acima da
          divisória, e nomes longos ("P2_LITE_SE-B") passavam por baixo dela.
          Com esse recuo o título termina acima do topo da foto, e aí pode
          usar a largura toda até o selo sem sumir atrás de nada. */}
      <div className="flex items-start justify-between gap-2 pl-4 pr-3 pt-2 pb-11">
        <div className="min-w-0">
          <p
            className="truncate text-[11px] font-medium uppercase"
            style={{ color: 'var(--color-muted-foreground)', letterSpacing: '0.06em' }}
          >
            {d.fabricante}
          </p>
          {/* Só o modelo: o fabricante já está na linha de cima, e
              `nomeComercial` costuma repetir os dois ("Positivo L400"). */}
          <h3 className="truncate text-[13px] font-semibold leading-snug" title={d.modelo}>
            {d.modelo}
          </h3>
        </div>

        <BadgeHomologado homologado={aprovado} />
      </div>

      <div className="relative border-t" style={{ background: 'var(--color-sidebar)' }}>
        <div className="absolute left-1/2 top-0" style={{ transform: 'translate(-50%, -45%)' }}>
          <div
            className="overflow-hidden rounded-2xl border shadow-xs"
            style={{ height: 96, width: 96, background: 'var(--color-card)' }}
          >
            <FotoDispositivo url={d.fotoUrl} nome={d.nomeComercial} altura={96} semBorda />
          </div>
        </div>

        {/* Dados e botão sobem para o lado da foto em vez de esperarem ela
            terminar: com o card em 300px sobram 86px de cada lado, e as duas
            linhas que ficam nessa altura ("Android 11", "Agente 12.6.8") são
            curtas o bastante para não alcançá-la. */}
        <div className="px-4 pt-6 pb-2">
          {/* Só o que distingue um modelo do outro à primeira vista. O resto
              da ficha está a um clique, na tela de informações. */}
          <dl className="space-y-0.5 text-xs leading-tight">
            <Linha rotulo="Android" valor={somenteVersaoAndroid(d.versaoSo)} />
            <Linha rotulo="Agente" valor={d.versaoAgente} />
            {d.numeroHomologacao > 1 && (
              <Linha
                rotulo="Retestes"
                valor={`${d.numeroHomologacao - 1} (${d.versoesAnteriores.join(', ')})`}
              />
            )}
          </dl>

          <Link
            to={`/dispositivos/${d.homologacaoId}`}
            className="mt-2 block w-full rounded-md py-1.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-xs"
            style={{ background: 'var(--gradient-brand-purple)' }}
          >
            Exibir informações
          </Link>
        </div>
      </div>
    </article>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt style={{ color: 'var(--color-muted-foreground)' }}>{rotulo}</dt>
      <dd className="truncate font-medium" title={valor}>
        {valor}
      </dd>
    </div>
  )
}

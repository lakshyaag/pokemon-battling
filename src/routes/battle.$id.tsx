import { Suspense, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Battle } from '@pkmn/client'
import { Generations } from '@pkmn/data'
import { Dex } from '@pkmn/sim'

export const Route = createFileRoute('/battle/$id')({
  component: BattleView,
})

function BattleView() {
  const { id } = Route.useParams() as { id: string }
  const battle = useQuery(api.battles.get, { battleId: id as unknown as any })

  // Local client battle from protocol lines
  const clientBattle = useMemo(() => {
    const gens = new Generations(Dex as unknown as any)
    const battleClient = new Battle(gens)
    for (const line of battle?.log ?? []) {
      if (line.startsWith('|')) battleClient.add(line)
    }
    return battleClient
  }, [battle?.log])

  const you = (clientBattle as any)?.p1
  const foe = (clientBattle as any)?.p2

  return (
    <div className="p-4">
      <Suspense fallback={<div>Loading battle...</div>}>
        <h1 className="text-xl font-semibold mb-2">Battle {id}</h1>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="font-medium">Opponent</h2>
            <pre className="text-xs bg-gray-100 p-2 rounded">
              {((foe?.team ?? []) as any[])
                .map((p) => `${p?.species?.name ?? '???'} HP:${p?.hp ?? 0}/${p?.maxhp ?? 0}`)
                .join('\n')}
            </pre>
          </div>
          <div>
            <h2 className="font-medium">You</h2>
            <pre className="text-xs bg-gray-100 p-2 rounded">
              {((you?.team ?? []) as any[])
                .map((p) => `${p?.species?.name ?? '???'} HP:${p?.hp ?? 0}/${p?.maxhp ?? 0}`)
                .join('\n')}
            </pre>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-medium mb-1">Log</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded max-h-80 overflow-auto">
            {(battle?.log ?? []).join('\n')}
          </pre>
        </div>
      </Suspense>
    </div>
  )
}


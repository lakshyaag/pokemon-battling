import { Suspense, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
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
  const submitChoice = useMutation(api.battles.submitChoice)
  const forfeit = useMutation(api.battles.forfeit)

  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
  const mySide: 'p1' | 'p2' | null =
    battle && myUserId
      ? (String(battle.players.p1UserId) === myUserId
          ? 'p1'
          : String(battle.players.p2UserId) === myUserId
            ? 'p2'
            : null)
      : null

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

  // Derive a simple request to offer actions (moves/switches)
  const request = (clientBattle as any)?.request
  const active = request?.active?.[0]
  const moves: { id: string; target?: string | null }[] = active?.moves ?? []
  const canSwitch = active?.canSwitch ?? false

  async function onChooseMove(idx: number) {
    if (!mySide) return
    await submitChoice({
      battleId: id as unknown as any,
      side: mySide,
      choice: `move ${idx + 1}`,
    })
  }

  async function onChooseSwitch(idx: number) {
    if (!mySide) return
    await submitChoice({
      battleId: id as unknown as any,
      side: mySide,
      choice: `switch ${idx + 1}`,
    })
  }

  async function onForfeit() {
    if (!mySide) return
    await forfeit({ battleId: id as unknown as any, side: mySide })
  }

  return (
    <div className="p-4">
      <Suspense fallback={<div>Loading battle...</div>}>
        <h1 className="text-xl font-semibold mb-2">Battle {id}</h1>
        <div className="text-sm text-gray-600 mb-2">You are: {mySide ?? 'spectator (set your userId in queue)'}</div>
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

        <div className="mt-4 border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Actions</h3>
            <button className="px-3 py-1 rounded border bg-white" onClick={onForfeit} disabled={!mySide}>
              Forfeit
            </button>
          </div>
          {request ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {moves?.map((m, i) => (
                  <button
                    key={i}
                    className="px-3 py-1 rounded border bg-white"
                    onClick={() => onChooseMove(i)}
                    disabled={!mySide}
                  >
                    Move {i + 1}: {m?.id ?? 'Unknown'}
                  </button>
                ))}
              </div>
              {canSwitch ? (
                <div className="flex flex-wrap gap-2">
                  {((you?.team ?? []) as any[])
                    .map((p, i) => (
                      <button
                        key={i}
                        className="px-3 py-1 rounded border bg-white"
                        onClick={() => onChooseSwitch(i)}
                        disabled={!mySide}
                      >
                        Switch {i + 1}: {p?.species?.name ?? '???'}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Waiting for request...</div>
          )}
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


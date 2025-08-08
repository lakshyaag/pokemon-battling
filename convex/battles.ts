import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

import { PRNG, Teams, Dex, BattleStreams } from '@pkmn/sim'
import { TeamGenerators } from '@pkmn/randoms'

// Configure team generator for @pkmn/sim convenience
Teams.setGeneratorFactory(TeamGenerators)

export const get = query({
  args: { battleId: v.id('battles') },
  handler: async (ctx, { battleId }) => {
    return await ctx.db.get(battleId)
  },
})

export const create = mutation({
  args: {
    p1UserId: v.id('users'),
    p2UserId: v.id('users'),
    format: v.string(),
  },
  handler: async (ctx, { p1UserId, p2UserId, format }) => {
    const createdAt = Date.now()
    const seedStr = new PRNG().getSeed()
    const seed = normalizeSeedToArray(seedStr)

    // Generate teams using randoms
    const p1PackedTeam = Teams.pack(Teams.generate(format))
    const p2PackedTeam = Teams.pack(Teams.generate(format))

    // Initialize battle via BattleStream to get initial protocol lines
    const initialLog = await simulateFromSeedAndChoices({
      format,
      seed,
      p1PackedTeam,
      p2PackedTeam,
      choices: [],
    })

    const battleId = await ctx.db.insert('battles', {
      format,
      seed,
      players: { p1UserId, p2UserId },
      teams: { p1PackedTeam, p2PackedTeam },
      status: 'active',
      winner: null,
      turn: 0,
      choices: [],
      log: initialLog,
      createdAt,
      updatedAt: createdAt,
    })
    return battleId
  },
})

export const submitChoice = mutation({
  args: {
    battleId: v.id('battles'),
    side: v.union(v.literal('p1'), v.literal('p2')),
    choice: v.string(), // eg: 'move 1', 'switch 2'
  },
  handler: async (ctx, { battleId, side, choice }) => {
    const battle = await ctx.db.get(battleId)
    if (!battle) throw new Error('Battle not found')

    // Append choice
    const nextTurn = inferTurnFromRequests(battle.log)
    const newChoices = [...battle.choices, { turn: nextTurn, side, choice }]

    // Re-simulate
    const fullLog = await simulateFromSeedAndChoices({
      format: battle.format,
      seed: battle.seed,
      p1PackedTeam: battle.teams.p1PackedTeam,
      p2PackedTeam: battle.teams.p2PackedTeam,
      choices: newChoices,
    })

    // Determine winner (best-effort by scanning log for |win|)
    const winner = extractWinner(fullLog)

    await ctx.db.patch(battleId, {
      choices: newChoices,
      log: fullLog,
      updatedAt: Date.now(),
      status: winner ? 'complete' : 'active',
      winner: winner as any,
      turn: inferTurnFromRequests(fullLog),
    })
  },
})

export const forfeit = mutation({
  args: {
    battleId: v.id('battles'),
    side: v.union(v.literal('p1'), v.literal('p2')),
  },
  handler: async (ctx, { battleId, side }) => {
    const battle = await ctx.db.get(battleId)
    if (!battle) throw new Error('Battle not found')
    const winner = side === 'p1' ? 'p2' : 'p1'
    await ctx.db.patch(battleId, {
      status: 'complete',
      winner: winner as any,
      updatedAt: Date.now(),
    })
  },
})

// --- Helpers ---

function extractWinner(log: string[]): 'p1' | 'p2' | null {
  const winLine = log.find((l) => l.startsWith('|win|'))
  if (!winLine) return null
  // Winner is by name, not p1/p2. We can't trivially map without names here.
  // MVP: return null and allow status to remain 'active' unless end detected elsewhere.
  return null
}

function inferTurnFromRequests(log: string[]): number {
  // Count occurrences of '|turn|' to derive current turn
  let turn = 0
  for (const line of log) if (line.startsWith('|turn|')) turn = Number(line.split('|')[2] || 0)
  return turn
}

async function simulateFromSeedAndChoices(args: {
  format: string
  seed: number[]
  p1PackedTeam: string
  p2PackedTeam: string
  choices: { turn: number; side: 'p1' | 'p2'; choice: string }[]
}): Promise<string[]> {
  const { format, seed, p1PackedTeam, p2PackedTeam, choices } = args

  const battleStream = new BattleStreams.BattleStream({}, Dex)
  const streams = BattleStreams.getPlayerStreams(battleStream as any)

  const spec = { formatid: format, seed }
  const p1spec = { name: 'p1', team: p1PackedTeam }
  const p2spec = { name: 'p2', team: p2PackedTeam }

  // Collect omniscient protocol lines
  const log: string[] = []
  const reader = (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of `${chunk}`.split('\n')) {
        if (line.startsWith('|')) log.push(line)
      }
    }
  })()

  // Start battle and set players
  await streams.omniscient.write(`>start ${JSON.stringify(spec)}\n` + `>player p1 ${JSON.stringify(p1spec)}\n` + `>player p2 ${JSON.stringify(p2spec)}`)

  // Feed choices by side
  const choicesByTurn = choices.sort((a, b) => a.turn - b.turn)
  for (const c of choicesByTurn) {
    await streams[c.side].write(c.choice)
  }

  await streams.omniscient.writeEnd()
  await reader
  return log
}

function normalizeSeedToArray(seedStr: string): number[] {
  // seedStr is PRNGSeed: either 'sodium,xxx', 'gen5,xxx' or 'number,number,number,number'
  // For BattleStream spec we want a 4-number array. Convert via PRNG.convertSeed when needed.
  // If it's a CSV of numbers, parse; otherwise use Gen5RNG.generateSeed as fallback.
  const parts = seedStr.split(',')
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    return parts.map((p) => Number(p))
  }
  // Fallback: derive a deterministic 4-number array from PRNG
  const pr = new PRNG(seedStr as any)
  return [pr.random(2 ** 16), pr.random(2 ** 16), pr.random(2 ** 16), pr.random(2 ** 16)]
}



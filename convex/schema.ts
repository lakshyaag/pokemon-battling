import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Users of the app
  users: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }).index('by_name', ['name']),

  // Simple matchmaking queue per format
  queue: defineTable({
    userId: v.id('users'),
    format: v.string(), // e.g. 'gen9randombattle'
    joinedAt: v.number(),
  }).index('by_format_joined', ['format', 'joinedAt']),

  // Battle documents store source of truth enabling deterministic replay
  battles: defineTable({
    format: v.string(),
    seed: v.array(v.number()), // 4-number seed
    players: v.object({
      p1UserId: v.id('users'),
      p2UserId: v.id('users'),
    }),
    teams: v.object({
      p1PackedTeam: v.string(),
      p2PackedTeam: v.string(),
    }),
    status: v.union(v.literal('waiting'), v.literal('active'), v.literal('complete')),
    winner: v.union(v.literal('p1'), v.literal('p2'), v.null()),
    turn: v.number(),
    choices: v.array(
      v.object({ turn: v.number(), side: v.union(v.literal('p1'), v.literal('p2')), choice: v.string() })
    ),
    log: v.array(v.string()), // PS protocol lines ("|...")
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_status', ['status'])
    .index('by_players', ['players.p1UserId'])
    .index('by_players2', ['players.p2UserId']),
})

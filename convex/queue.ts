import { mutation, query } from './_generated/server'
import { api } from './_generated/api'
import { v } from 'convex/values'

export const join = mutation({
  args: { userId: v.id('users'), format: v.string() },
  handler: async (ctx, { userId, format }): Promise<any> => {
    // Check if already queued
    const existing = await ctx.db
      .query('queue')
      .withIndex('by_format_joined', (q) => q.eq('format', format))
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()
    if (existing) return existing._id

    const joinedAt = Date.now()
    const id = await ctx.db.insert('queue', { userId, format, joinedAt })
    return id
  },
})

export const leave = mutation({
  args: { userId: v.id('users'), format: v.string() },
  handler: async (ctx, { userId, format }): Promise<void> => {
    const entries = await ctx.db
      .query('queue')
      .withIndex('by_format_joined', (q) => q.eq('format', format))
      .collect()
    for (const e of entries) {
      if (e.userId === userId) await ctx.db.delete(e._id)
    }
  },
})

export const findMatch = mutation({
  args: { format: v.string() },
  handler: async (ctx, { format }): Promise<string | null> => {
    const entries = await ctx.db
      .query('queue')
      .withIndex('by_format_joined', (q) => q.eq('format', format))
      .order('asc')
      .take(2)
    if (entries.length < 2) return null

    const [a, b] = entries
    // Remove from queue
    await ctx.db.delete(a._id)
    await ctx.db.delete(b._id)

    // Create battle via battles.create
    const battleId = await ctx.runMutation(api.battles.create, {
      p1UserId: a.userId,
      p2UserId: b.userId,
      format,
    })
    return battleId as unknown as string
  },
})

export const list = query({
  args: { format: v.string() },
  handler: async (ctx, { format }): Promise<any[]> => {
    return await ctx.db
      .query('queue')
      .withIndex('by_format_joined', (q) => q.eq('format', format))
      .collect()
  },
})



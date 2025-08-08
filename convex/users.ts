import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const id = await ctx.db.insert('users', { name, createdAt: Date.now() })
    return id
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('users').withIndex('by_name').collect()
  },
})
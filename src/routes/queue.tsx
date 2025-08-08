import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/queue')({
  component: QueuePage,
})

function QueuePage() {
  const [userId, setUserId] = useState('')
  const [format, setFormat] = useState('gen9randombattle')
  const nav = useNavigate()

  const join = useMutation(api.queue.join)
  const leave = useMutation(api.queue.leave)
  const findMatch = useMutation(api.queue.findMatch)
  const entries = useQuery(api.queue.list, { format })

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Matchmaking Queue</h1>
      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-2 py-1"
          placeholder="Your userId (Convex _id)"
          value={userId}
          onChange={(e) => setUserId((e.target as HTMLInputElement).value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Format"
          value={format}
          onChange={(e) => setFormat((e.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          className="border rounded px-3 py-1"
          onClick={async () => {
            if (!userId) return
            await join({ userId: userId as unknown as any, format })
          }}
        >
          Join
        </button>
        <button
          type="button"
          className="border rounded px-3 py-1"
          onClick={async () => {
            if (!userId) return
            await leave({ userId: userId as unknown as any, format })
          }}
        >
          Leave
        </button>
        <button
          type="button"
          className="border rounded px-3 py-1"
          onClick={async () => {
            const id = await findMatch({ format })
            if (id) nav({ to: '/battle/$id', params: { id: id as any } })
          }}
        >
          Find Match
        </button>
      </div>
      <div>
        <h2 className="font-medium mb-2">Queue ({format})</h2>
        <ul className="list-disc pl-5">
          {(entries ?? []).map((e) => (
            <li key={e._id}>{String(e.userId)} @ {new Date(e.joinedAt).toLocaleTimeString()}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}



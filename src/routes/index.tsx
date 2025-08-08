import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Pokémon Battling</h1>
      <p className="text-gray-700">Queue up to start a Gen 9 Random Battle and open the battle page to play.</p>
      <div className="flex gap-3">
        <Link to="/queue" className="underline text-blue-600">Open Queue</Link>
        <Link to="/battle/$id" params={{ id: 'demo' as any }} className="underline text-blue-600">Battle (Enter a real id after matching)</Link>
      </div>
    </div>
  )
}

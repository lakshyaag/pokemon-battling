## Pokémon Battling – Project Plan

See architecture choices, data model, and milestones. This file guides implementation and can be updated as we iterate.

References:
- pkmn/ps: https://github.com/pkmn/ps
- SIM-PROTOCOL: https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md
- Packages used: @pkmn/sim, @pkmn/dex, @pkmn/data, @pkmn/protocol, @pkmn/client, @pkmn/view, @pkmn/img, @pkmn/randoms

Key decisions:
- Server-authoritative `@pkmn/sim` in Convex functions, deterministic replay from seed + choices.
- Clients subscribe to battle logs and derive state with `@pkmn/client`.
- Matchmaking via Convex queue; format MVP: `gen9randombattle`.

Milestones:
1) Scaffold app (done). Add pkmn packages (done). Add schema and basic routes (done).
2) Implement battle creation, submitChoice flow, and client-side action UI (next).
3) Polish with sprites (`@pkmn/img`), shadcn/ui components, and UX.



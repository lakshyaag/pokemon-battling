import fs from "node:fs";
import { Battle, Pokemon, Side } from "@pkmn/client";
import { GenerationNum, Generations } from "@pkmn/data";
import { GraphicsGen, Icons, Sprites } from "@pkmn/img";
import {
	ArgName,
	ArgType,
	BattleArgsKWArgType,
	Handler,
	Protocol,
} from "@pkmn/protocol";
import { TeamGenerators } from "@pkmn/randoms";
import { Data, PokemonSet, Teams } from "@pkmn/sets";

import {
	BattleStreams,
	Teams as DTeams,
	Dex,
	PRNG,
	RandomPlayerAI,
	TeamValidator,
} from "@pkmn/sim";
import { LogFormatter } from "@pkmn/view";

const prng = new PRNG();
const FORMAT = "gen7anythinggoes";

const spec = { formatid: FORMAT };
const p1spec = { name: "Bot A" };
const p2spec = { name: "Bot B" };

const validator = new TeamValidator(FORMAT);
const dex = Dex.forFormat(FORMAT);
DTeams.setGeneratorFactory(TeamGenerators);

const gens = new Generations(Dex);

console.log(`List of pokemon in selected format: ${JSON.stringify(gens.dex.species.getByID("pikachu"))}`)
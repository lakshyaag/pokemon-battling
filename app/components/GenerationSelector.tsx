import { useSettings } from "@/app/store/settings";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { GenerationNum } from "@pkmn/types";

export function GenerationSelector() {
	const { generation, setGeneration } = useSettings();

	const generations = Array.from(
		{ length: 9 },
		(_, i) => (i + 1) as GenerationNum,
	);

	return (
		<Select
			value={generation.toString()}
			onValueChange={(value) =>
				setGeneration(Number.parseInt(value) as GenerationNum)
			}
		>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Select Generation" />
			</SelectTrigger>
			<SelectContent>
				{generations.map((gen) => (
					<SelectItem key={gen} value={gen.toString()}>
						Generation {gen}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

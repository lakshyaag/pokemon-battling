import { useState } from "react";
import MoveList from "./MoveList";

type MoveSelectorProps = {
	moves: string[];
	onSelectMove: (move: string) => void;
	disabled?: boolean;
	title?: string;
	className?: string;
};

/**
 * Component for selecting a move from a list of Pokémon moves
 * Handles state management and delegates UI rendering to MoveList
 */
export default function MoveSelector({
	moves,
	onSelectMove,
	disabled = false,
	title = "Select a Move",
	className = "",
}: MoveSelectorProps) {
	const [selectedMove, setSelectedMove] = useState<string>("");

	const handleSelectMove = (move: string) => {
		setSelectedMove(move);
		onSelectMove(move);
	};

	return (
		<MoveList
			moves={moves}
			selectedMove={selectedMove}
			onSelectMove={handleSelectMove}
			disabled={disabled}
			title={title}
			className={className}
		/>
	);
}

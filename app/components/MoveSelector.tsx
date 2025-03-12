import { useState } from "react";

type MoveSelectorProps = {
	moves: string[];
	onSelectMove: (move: string) => void;
	disabled?: boolean;
	title?: string;
	className?: string;
};

/**
 * Component for selecting a move from a list of Pokémon moves
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
		<div className={`p-4 ${className}`}>
			<h4 className="font-medium mb-2">{title}:</h4>

			{moves.length === 0 ? (
				<p className="text-sm italic">No moves available</p>
			) : (
				<div className="grid grid-cols-2 gap-2">
					{moves.map((move, index) => (
						<button
							key={index}
							onClick={() => handleSelectMove(move)}
							disabled={disabled}
							className={`
                py-2 px-3 rounded text-sm capitalize border
                ${
									selectedMove === move
										? "bg-green-500 text-white border-green-600"
										: "bg-white hover:bg-gray-100 border-gray-300"
								}
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
						>
							{move.replace(/-/g, " ")}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

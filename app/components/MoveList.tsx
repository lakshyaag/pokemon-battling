import React from "react";
import MoveButton from "./MoveButton";

type MoveListProps = {
	moves: string[];
	selectedMove?: string;
	onSelectMove?: (move: string) => void;
	disabled?: boolean;
	title?: string;
	className?: string;
};

/**
 * Pure UI component for displaying a grid of move buttons
 */
export default function MoveList({
	moves,
	selectedMove,
	onSelectMove,
	disabled = false,
	title = "Moves",
	className = "",
}: MoveListProps) {
	return (
		<div className={`p-4 ${className}`}>
			<h4 className="font-medium mb-2">{title}:</h4>

			{moves.length === 0 ? (
				<p className="text-sm italic">No moves available</p>
			) : (
				<div className="grid grid-cols-2 gap-2">
					{moves.map((move) => (
						<MoveButton
							key={move}
							move={move}
							isSelected={selectedMove === move}
							onClick={() => onSelectMove?.(move)}
							disabled={disabled}
						/>
					))}
				</div>
			)}
		</div>
	);
}

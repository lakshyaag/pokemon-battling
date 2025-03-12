import React from "react";

type MoveButtonProps = {
  move: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
};

/**
 * Pure UI component for a single move button
 */
export default function MoveButton({
  move,
  isSelected,
  onClick,
  disabled = false,
}: MoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        py-2 px-3 rounded text-sm capitalize border
        ${
          isSelected
            ? "bg-green-500 text-white border-green-600"
            : "bg-white hover:bg-gray-100 border-gray-300"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {move.replace(/-/g, " ")}
    </button>
  );
} 
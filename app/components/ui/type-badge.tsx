import React from "react";
import { Badge } from "./badge";
import { TYPE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TypeBadgeProps {
	type: string;
	className?: string;
}

/**
 * A badge component for displaying Pokémon types with appropriate colors
 */
export function TypeBadge({ type, className }: TypeBadgeProps) {
	const typeClass =
		TYPE_COLORS[type as keyof typeof TYPE_COLORS] ||
		"bg-gray-400 hover:bg-gray-500 text-white";

	return (
		<Badge className={cn("font-medium", typeClass, className)}>{type}</Badge>
	);
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { TypeName } from "@pkmn/types";

// Define variants based on Pokémon types
const typeBadgeVariants = cva(
	"text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize shadow-sm transition-colors",
	{
		variants: {
			type: {
				normal:
					"bg-gray-400/20 border-gray-400/50 text-gray-700 dark:text-gray-300 hover:bg-gray-400/30",
				fire: "bg-red-400/20 border-red-400/50 text-red-700 dark:text-red-300 hover:bg-red-400/30",
				water:
					"bg-blue-400/20 border-blue-400/50 text-blue-700 dark:text-blue-300 hover:bg-blue-400/30",
				electric:
					"bg-yellow-400/20 border-yellow-400/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-400/30",
				grass:
					"bg-emerald-400/20 border-emerald-400/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-400/30",
				ice: "bg-cyan-400/20 border-cyan-400/50 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-400/30",
				fighting:
					"bg-red-600/20 border-red-600/50 text-red-800 dark:text-red-400 hover:bg-red-600/30",
				poison:
					"bg-purple-400/20 border-purple-400/50 text-purple-700 dark:text-purple-300 hover:bg-purple-400/30",
				ground:
					"bg-amber-600/20 border-amber-600/50 text-amber-800 dark:text-amber-400 hover:bg-amber-600/30",
				flying:
					"bg-sky-400/20 border-sky-400/50 text-sky-700 dark:text-sky-300 hover:bg-sky-400/30",
				psychic:
					"bg-pink-400/20 border-pink-400/50 text-pink-700 dark:text-pink-300 hover:bg-pink-400/30",
				bug: "bg-lime-400/20 border-lime-400/50 text-lime-700 dark:text-lime-300 hover:bg-lime-400/30",
				rock: "bg-stone-500/20 border-stone-500/50 text-stone-700 dark:text-stone-400 hover:bg-stone-500/30",
				ghost:
					"bg-purple-600/20 border-purple-600/50 text-purple-800 dark:text-purple-400 hover:bg-purple-600/30",
				dragon:
					"bg-violet-500/20 border-violet-500/50 text-violet-700 dark:text-violet-300 hover:bg-violet-500/30",
				dark: "bg-neutral-600/20 border-neutral-600/50 text-neutral-800 dark:text-neutral-400 hover:bg-neutral-600/30",
				steel:
					"bg-slate-400/20 border-slate-400/50 text-slate-700 dark:text-slate-300 hover:bg-slate-400/30",
				fairy:
					"bg-pink-300/20 border-pink-300/50 text-pink-600 dark:text-pink-300 hover:bg-pink-300/30",
				unknown:
					"bg-gray-300/20 border-gray-300/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/30",
			},
		},
		defaultVariants: {
			type: "unknown",
		},
	},
);

export interface TypeBadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof typeBadgeVariants> {
	type: string; // Accept string for flexibility, handle lowercase internally
}

function TypeBadge({ className, type, ...props }: TypeBadgeProps) {
	const typeName = (type?.toLowerCase() || "unknown") as TypeName | "unknown";

	return (
		<Badge
			className={cn(typeBadgeVariants({ type: typeName }), className)}
			variant="outline" // Use outline variant of shadcn badge as base
			{...props}
		>
			{type || "???"}
		</Badge>
	);
}

export { TypeBadge, typeBadgeVariants };

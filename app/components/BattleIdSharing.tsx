import React, { useState } from "react";
import { Copy, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BattleIdSharingProps {
	battleId: string;
}

export default function BattleIdSharing({ battleId }: BattleIdSharingProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(battleId);
		toast("Battle ID copied to clipboard", {
			dismissible: true,
			duration: 2000,
		});
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="mt-6 space-y-4">
			<div className="flex items-center justify-center">
				<div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center animate-pulse">
					<Share2 className="h-6 w-6 text-primary" />
				</div>
			</div>

			<h3 className="text-lg font-semibold text-primary">
				Share this battle ID
			</h3>

			<div className="bg-muted/50 rounded-lg p-3 flex flex-col gap-3">
				<div className="flex items-center justify-between gap-2 bg-background rounded-md p-2 border">
					<code className="text-sm font-mono w-full text-center overflow-hidden truncate">
						{battleId}
					</code>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={handleCopy}
						title="Copy battle ID to clipboard"
					>
						{copied ? (
							<Check className="h-4 w-4" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}

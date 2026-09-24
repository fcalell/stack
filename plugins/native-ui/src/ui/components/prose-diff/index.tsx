import { text } from "@fcalell/ui-core/variants";
import { diffWords } from "diff";
import { Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";

export interface ProseDiffProps extends Closed {
	before: string;
	after: string;
	loading?: boolean;
}

// Prose with an added run on ok-soft and a removed one on danger-soft,
// struck through.
export function ProseDiff({ before, after, loading }: ProseDiffProps) {
	if (loading) return <LoadingRows />;
	const parts = diffWords(before, after);
	return (
		<RNText className={text({ role: "body" })}>
			{parts.map((part, index) => (
				<RNText
					// biome-ignore lint/suspicious/noArrayIndexKey: runs are positional
					key={index}
					className={cn(
						part.added && "bg-ok-soft",
						part.removed && "bg-danger-soft line-through",
					)}
				>
					{part.value}
				</RNText>
			))}
		</RNText>
	);
}

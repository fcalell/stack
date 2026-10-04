import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed";
import { EmptyStateBase } from "./base";

export interface EmptyStateProps extends Closed {
	// The glyph in the mark's disc.
	icon?: IconName;
	// The line over the sentence.
	title?: string;
	// What is missing and what the act makes.
	sentence: string;
	// The way to make the first one.
	act?: Act;
	// What still stands: under it on a page, in its acts column on a first
	// run.
	children?: ReactNode;
}

// The mark, the title over the sentence, and the act, in a column at the
// empty width, its form decided by where it stands: on a page (a Place or a
// Screen) it centres in what the body leaves, or stands at the body's top
// over its children, its title at the heading role and its act the filled
// one with the plus; in a Section it stands in a hairline frame, and in a
// Group in the card (the card its frame), its title at body 500 and its act
// the hairline one; anywhere else it is a first run,
// its title at the title role and its acts stacked across the column.
export function EmptyState({
	icon,
	title,
	sentence,
	act,
	children,
}: EmptyStateProps) {
	return (
		<EmptyStateBase
			tone="rest"
			icon={icon}
			title={title}
			sentence={sentence}
			act={act}
		>
			{children}
		</EmptyStateBase>
	);
}

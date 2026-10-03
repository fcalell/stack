import { cn } from "@fcalell/ui-core/cn";
import { type LinkFit, link } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";

// Inline is underlined at rest and plain under the pointer; standalone the
// other way round. A standalone link's box keeps to its words in a stretching
// parent.
const OVERLAY: Record<LinkFit, string> = {
	inline: "hover:no-underline active:no-underline",
	standalone: "inline-flex items-center w-fit hover:underline active:underline",
};

/** A navigation to another place. */
export interface LinkProps extends Closed {
	/** Where it goes. */
	href: string;
	/** Inside a line of text (the default), or on its own at the target height. */
	fit?: LinkFit;
	/** The words. */
	children?: ReactNode;
}

/** An anchor in accent ink, in the type of the line it sits in. */
export function Link({ href, fit, children }: LinkProps) {
	const place = fit ?? "inline";
	return (
		<a href={href} className={cn(link({ fit: place }), OVERLAY[place])}>
			{children}
		</a>
	);
}

import { A } from "@solidjs/router";
import type { JSX } from "solid-js";
import type { Closed } from "#lib/closed";

// Inline, inside `body` or `meta`; never a screen's only act.
export type LinkProps = Closed & {
	href: string;
	children?: JSX.Element;
};

export function Link(props: LinkProps) {
	return (
		<A
			href={props.href}
			class="text-tint underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint"
		>
			{props.children}
		</A>
	);
}

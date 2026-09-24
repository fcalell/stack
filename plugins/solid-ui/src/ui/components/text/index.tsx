import { type TextRole, text } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Closed } from "#lib/closed.ts";

// The only way to set type: the role carries its size, leading, weight, ink
// and family. Headings take a heading element, the rest a paragraph.
export type TextProps = Closed & {
	role?: TextRole;
	children?: JSX.Element;
};

const ELEMENT: Record<TextRole, "h1" | "h2" | "p"> = {
	display: "h1",
	title: "h1",
	heading: "h2",
	body: "p",
	meta: "p",
	label: "p",
	mono: "p",
};

export function Text(props: TextProps) {
	const role = () => props.role ?? "body";
	return (
		<Dynamic component={ELEMENT[role()]} class={text({ role: role() })}>
			{props.children}
		</Dynamic>
	);
}

import type { Run, Runs } from "@fcalell/ui-core/descriptors";
import { type TextRole, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { RunText } from "../../lib/code";

export interface TextProps extends Closed {
	role?: TextRole;
	/** The text (text; wraps): words, or runs, where a `{ strong }` run is words at weight 500 and a `{ code }` run a span of code. */
	children?: ReactNode | Run | Runs;
}

// Runs are strings and objects of one of the run kinds, which a React element
// never is.
const isRun = (part: unknown): part is Run =>
	typeof part === "string" ||
	(typeof part === "object" &&
		part !== null &&
		("strong" in part || "code" in part || "quoted" in part));

function runsIn(children: TextProps["children"]): Runs | undefined {
	if (Array.isArray(children) && children.every(isRun)) return children;
	return typeof children === "object" && isRun(children)
		? [children]
		: undefined;
}

// The only way to set type; ink and family ride with the role. A run of
// emphasis inside it is a `{ strong }` run: a nested React Native Text inherits
// the line's role, ink and family.
export function Text({ role, children }: TextProps) {
	const runs = runsIn(children);
	return (
		<RNText className={text({ role: role ?? "body" })}>
			{runs ? <RunText runs={runs} /> : (children as ReactNode)}
		</RNText>
	);
}

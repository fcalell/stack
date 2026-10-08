import { cn } from "@fcalell/ui-core/cn";
import type { Sentence } from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import { PROSE_CODESPAN, textStrong } from "@fcalell/ui-core/variants";

// A whole value of code in the room its box leaves: the stem truncates to it
// and the tail stands whole (`valueCut`).
const CUT = "flex min-w-0";
const STEM = "min-w-0 truncate";
const TAIL = "shrink-0";

/** A span of code that is a whole title or meta part: one value, cut in its middle to keep its start and its end. Outside the package's exports. */
export function CodeCut(props: { code: string }) {
	const { stem, tail } = valueCut(props.code);
	return (
		<code className={cn(PROSE_CODESPAN, CUT)}>
			<span className={STEM}>{stem}</span>
			{tail ? <span className={TAIL}>{tail}</span> : null}
		</code>
	);
}

/** A sentence's runs: words, a `{ strong }` run at strong weight in the meta role, a `{ code }` run in the inline code style, which never cuts in its middle. Outside the package's exports. */
export function Runs(props: { runs: Sentence }) {
	return props.runs.map((run, at) => {
		if (typeof run === "string") return run;
		if ("code" in run)
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
				<code key={at} className={PROSE_CODESPAN}>
					{run.code}
				</code>
			);
		return (
			// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
			<span key={at} className={textStrong({ role: "meta" })}>
				{run.strong}
			</span>
		);
	});
}

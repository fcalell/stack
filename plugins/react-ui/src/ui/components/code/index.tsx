import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import { counted } from "@fcalell/ui-core/tokens";
import {
	CODE_ACT,
	CODE_FOLD,
	CODE_HEAD,
	CODE_UNDER_HEAD,
	CONTENT_FRAME,
	codeText,
	lineBox,
	skeleton,
	text,
} from "@fcalell/ui-core/variants";
import { useId, useRef, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useCopy } from "../../lib/copy.ts";
import { InsetRing } from "../../lib/ring.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";

const FRAME = "flex flex-col min-w-0 overflow-hidden";
const HEAD = "flex items-center";
const TITLE = "grow min-w-0 truncate";
const BODY = "flex min-w-0";
// The text scrolls sideways and never wraps; focusable so a keyboard scrolls
// it, its ring inward inside the frame's clip.
const TEXT =
	"overflow-x-auto whitespace-pre focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const TEXT_BESIDE = "grow min-w-0";
const ACT = "shrink-0";
const LINE = "flex items-center h-lh";
const FOLD =
	"flex items-center w-full hover:bg-wash-hover active:bg-wash-press focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const WAIT = "flex flex-col";
const FOLD_WAIT = "flex items-center w-full";
// The loading lines, each at the length of the line it stands in for, in
// turn; the fold's word at a third.
const BARS = ["w-2/3", "w-1/2", "w-3/4"] as const;
const FOLD_BAR = "w-1/3";
const BAR = "w-full";

/** Text a machine reads, in mono, whole. */
export interface CodeProps extends Closed {
	/** The text, its lines split on newlines. */
	text: string;
	/** What the text is (a file's name, the tool it goes into), in a head over it; it names the text. */
	title?: string;
	/** Shows only the last lines, this many, behind an act that reveals the earlier ones. */
	tail?: number;
	/** Adds the copy act: in the head with a title, else in its own column beside the first line. */
	copy?: boolean;
	/** The text waits: line boxes stand in for it under the head, `tail` of them under the fold's when it folds. */
	loading?: boolean;
}

// The copy act: a check and the word Copied for two seconds once copied.
function CopyAct(props: { name: string; text: string }) {
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<InsetRing value>
			<IconButton
				icon={done ? "Check" : "Copy"}
				label={done ? words.copied : `${words.copy} ${props.name}`}
				onAct={() => copy(props.text)}
			/>
		</InsetRing>
	);
}

/** Mono at the code role in the frame Code, Diff and ProseDiff share; never wraps, the text scrolling sideways inside the frame. A head names it (`title`) and carries the copy act; without a title the act stands in its own column beside the first line. `tail` folds the earlier lines behind a one-way act that reveals them and leaves, the focus landing on the text. */
export function Code({ text: source, title, tail, copy, loading }: CodeProps) {
	const words = useWords();
	const id = useId();
	const textRef = useRef<HTMLPreElement>(null);
	const [unfolded, setUnfolded] = useState(false);
	const name = title ?? words.code;
	const head = title ? (
		<div className={cn(CODE_HEAD, HEAD)}>
			<span className={cn(text({ role: "meta" }), TITLE)}>{title}</span>
			{copy && !loading ? <CopyAct name={name} text={source} /> : null}
		</div>
	) : null;
	// A folding text waits as it lands: the fold's row over `tail` lines.
	const waiting =
		tail === undefined
			? BARS
			: Array.from({ length: tail }, (_, at) => BARS[at % BARS.length]);
	if (loading)
		return (
			<div aria-busy className={cn(CONTENT_FRAME, FRAME)}>
				{head}
				{tail === undefined ? null : (
					<div className={cn(CODE_FOLD, title && CODE_UNDER_HEAD, FOLD_WAIT)}>
						<span className={cn(lineBox({ role: "meta" }), LINE, FOLD_BAR)}>
							<span className={cn(skeleton({ kind: "line" }), BAR)} />
						</span>
					</div>
				)}
				<div
					className={cn(
						codeText({ act: "none" }),
						title && tail === undefined && CODE_UNDER_HEAD,
						WAIT,
					)}
				>
					{waiting.map((width, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
						<span key={index} className={cn(lineBox({ role: "code" }), LINE)}>
							<span className={cn(skeleton({ kind: "line" }), width)} />
						</span>
					))}
				</div>
			</div>
		);
	const lines = source.split("\n");
	const hidden =
		tail !== undefined && !unfolded ? Math.max(0, lines.length - tail) : 0;
	const shown = hidden > 0 ? lines.slice(hidden) : lines;
	const beside = copy === true && !title;
	const fold =
		hidden > 0 ? (
			<BaseButton
				aria-expanded={false}
				aria-controls={id}
				onClick={() => {
					setUnfolded(true);
					// The act leaves with the lines it folded; the focus lands on them.
					requestAnimationFrame(() => textRef.current?.focus());
				}}
				className={cn(CODE_FOLD, title && CODE_UNDER_HEAD, FOLD)}
			>
				<Icon name="ChevronUp" fit="meta" />
				<span className={text({ role: "meta" })}>
					{counted(words.earlierLines, hidden)}
				</span>
			</BaseButton>
		) : null;
	const body = (
		// biome-ignore lint/a11y/useSemanticElements: a named text, not a form's fieldset; a group adds no landmark per block
		<pre
			ref={textRef}
			id={id}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: a keyboard scrolls the text sideways
			tabIndex={0}
			role="group"
			aria-label={name}
			className={cn(
				text({ role: "code" }),
				codeText({ act: beside ? "beside" : "none" }),
				title && !fold && CODE_UNDER_HEAD,
				TEXT,
				beside && TEXT_BESIDE,
			)}
		>
			<code>{shown.join("\n")}</code>
		</pre>
	);
	return (
		<div className={cn(CONTENT_FRAME, FRAME)}>
			{head}
			{fold}
			{beside ? (
				<div className={BODY}>
					{body}
					<span className={cn(CODE_ACT, ACT)}>
						<span className={cn(lineBox({ role: "code" }), LINE)}>
							<CopyAct name={name} text={source} />
						</span>
					</span>
				</div>
			) : (
				body
			)}
		</div>
	);
}

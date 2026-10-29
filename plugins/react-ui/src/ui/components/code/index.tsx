import { Button as BaseButton } from "@base-ui/react/button";
import {
	type Datum,
	type Drawn,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { Run, Runs } from "@fcalell/ui-core/descriptors";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { counted, named } from "@fcalell/ui-core/tokens";
import {
	CARD,
	CODE_ACT,
	CODE_FOLD,
	CODE_HEAD,
	CODE_UNDER_HEAD,
	codeText,
	lineBox,
	text,
} from "@fcalell/ui-core/variants";
import { Fragment, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { CodeBound, RunText } from "../../lib/code.tsx";
import { useCopy } from "../../lib/copy.ts";
import { Painted } from "../../lib/paint.tsx";
import { partRuns, partText } from "../../lib/parts.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Icon } from "../icon/index.tsx";

const FRAME = "flex flex-col shrink-0 min-w-0 overflow-hidden";
const HEAD = "flex items-center";
const TITLE = "grow min-w-0 truncate";
const BODY = "flex min-w-0";
// The text keeps its line breaks and wraps a long token anywhere, so an
// argument reads whole at any width. Focusable by script (the fold lands on
// it), its ring inward inside the frame's clip.
const TEXT =
	"whitespace-pre-wrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const TEXT_BESIDE = "grow min-w-0";
const ACT = "shrink-0";
const LINE = "flex items-center h-lh";
const ACTS = "gap-gap";
const FOLD =
	"flex items-center w-full hover:bg-wash-hover active:bg-wash-press focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

/** Text a machine reads, in mono, whole. */
export interface CodeProps extends Closed {
	/** The text, its lines split on newlines (text; wraps at any width). A selection paints `PAINT_ROWS` lines until its read lands. */
	text: Datum<string>;
	/** What the text is (a file's name, the tool it goes into), in a head over it; it names the text and its acts (a short phrase; truncates). A command or a machine name is a `{ code }` run, in the mono. */
	title?: Run | Runs;
	/** Shows only the last lines, this many, behind an act that reveals the earlier ones. */
	tail?: number;
	/** Adds the copy act, named by the title (else by the download's file, else just Copy): in the head with a title, else in a column beside the first line. */
	copy?: boolean;
	/** Adds the download act, saving the text as a file of this name (`recovery-codes.txt`), named by the title (else by the file): after the copy act, in the same place. */
	download?: string;
}

// The download act: the text as a file of the given name, saved through an
// anchor.
function DownloadAct(props: {
	name: string;
	text: string;
	file: string;
	painted: boolean;
}) {
	const words = useWords();
	return (
		<IconButtonBase
			inset
			painted={props.painted}
			icon="Download"
			label={named(words.download, props.name)}
			onClick={() => {
				const url = URL.createObjectURL(
					new Blob([props.text], { type: "text/plain" }),
				);
				const link = document.createElement("a");
				link.href = url;
				link.download = props.file;
				link.click();
				setTimeout(() => URL.revokeObjectURL(url));
			}}
		/>
	);
}

// The copy act: a check and the word Copied for two seconds once copied.
function CopyAct(props: { name?: string; text: string; painted: boolean }) {
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<IconButtonBase
			inset
			painted={props.painted}
			icon={done ? "Check" : "Copy"}
			label={done ? words.copied : named(words.copy, props.name)}
			onClick={() => copy(props.text)}
		/>
	);
}

/** Mono at the code role in the frame Code, Diff share; keeps its line breaks and wraps a long line at any width, never scrolling sideways. A head names it (`title`) and carries the copy and download acts; without a title they stand side by side in a column beside the first line. `tail` folds the earlier lines behind a one-way act that reveals them and leaves, the focus landing on the text. */
export function Code({
	text: datum,
	title: titled,
	tail,
	copy,
	download,
}: CodeProps) {
	// The title's words name the text and its acts; its runs draw in the head.
	const title =
		titled === undefined ? undefined : partText(titled) || undefined;
	const [drawn] = useSelections([datum] as const) as [Drawn<string>];
	const painted = paints(drawn);
	const source = drawn.painted ? "" : drawn.value;
	const words = useWords();
	const id = useId();
	const [textNode, setTextNode] = useState<HTMLPreElement | null>(null);
	const [unfolded, setUnfolded] = useState(false);
	// The earlier lines come in as a block: the frame is named, so it grows by
	// the page's block move and what follows moves with it.
	const name = title ?? words.code;
	// The acts' name: the title, else the file the download saves.
	const actName = title ?? download;
	const acts = (
		<>
			{copy ? <CopyAct name={actName} text={source} painted={painted} /> : null}
			{download ? (
				<DownloadAct
					name={title ?? download}
					text={source}
					file={download}
					painted={painted}
				/>
			) : null}
		</>
	);
	const head =
		titled && title ? (
			<div className={cn(CODE_HEAD, HEAD)}>
				<span className={cn(text({ role: "meta" }), TITLE)}>
					<RunText runs={partRuns(titled)} fit="name" />
				</span>
				{acts}
			</div>
		) : null;
	// Painted, the text is `PAINT_ROWS` lines of filler and never folds.
	const lines = painted ? [] : source.split("\n");
	const hidden =
		tail !== undefined && !unfolded ? Math.max(0, lines.length - tail) : 0;
	const shown = hidden > 0 ? lines.slice(hidden) : lines;
	const beside = (copy === true || download !== undefined) && !title;
	const fold =
		hidden > 0 ? (
			<BaseButton
				aria-expanded={false}
				aria-controls={id}
				onClick={() => {
					// The act leaves with the lines it folded: the focus moves to the
					// text, mounted already, before the act goes.
					textNode?.focus();
					setUnfolded(true);
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
			ref={setTextNode}
			id={id}
			// Focusable by script only (the fold lands on it), out of the tab order.
			tabIndex={-1}
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
			<code>
				{painted ? (
					Array.from({ length: PAINT_ROWS }, (_, at) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
						<Fragment key={at}>
							{at > 0 ? "\n" : null}
							<Painted role="sentence" at={at} />
						</Fragment>
					))
				) : (
					<CodeBound code={shown.join("\n")} />
				)}
			</code>
		</pre>
	);
	// An ended read draws no text; the frame that holds it says why.
	if (drawn.painted && !painted) return null;
	return (
		<div inert={painted || undefined} className={cn(CARD, FRAME)}>
			{head}
			{fold}
			{beside ? (
				<div className={BODY}>
					{body}
					<span className={cn(CODE_ACT, ACT)}>
						<span className={cn(lineBox({ role: "code" }), LINE, ACTS)}>
							{acts}
						</span>
					</span>
				</div>
			) : (
				body
			)}
		</div>
	);
}

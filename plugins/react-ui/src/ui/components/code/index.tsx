import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import { counted, named } from "@fcalell/ui-core/tokens";
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
import { use, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useCopy } from "../../lib/copy.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { InsetRing } from "../../lib/ring.ts";
import { useScrolls } from "../../lib/scrolls.ts";
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
const ACTS = "gap-acts";
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
	/** What the text is (a file's name, the tool it goes into), in a head over it; it names the text and its acts. */
	title?: string;
	/** Shows only the last lines, this many, behind an act that reveals the earlier ones. */
	tail?: number;
	/** Adds the copy act, named by the title (else by the download's file, else just Copy): in the head with a title, else in a column beside the first line. */
	copy?: boolean;
	/** Adds the download act, saving the text as a file of this name (`recovery-codes.txt`), named by the title (else by the file): after the copy act, in the same place. */
	download?: string;
	/** The text waits: line boxes stand in for it under the head, `tail` of them under the fold's when it folds. Unset, a loading `Section` or `Group` around it makes it wait. */
	loading?: boolean;
}

// The download act: the text as a file of the given name, saved through an
// anchor.
function DownloadAct(props: { name: string; text: string; file: string }) {
	const words = useWords();
	return (
		<InsetRing value>
			<IconButton
				icon="Download"
				label={named(words.download, props.name)}
				onAct={() => {
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
		</InsetRing>
	);
}

// The copy act: a check and the word Copied for two seconds once copied.
function CopyAct(props: { name?: string; text: string }) {
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<InsetRing value>
			<IconButton
				icon={done ? "Check" : "Copy"}
				label={done ? words.copied : named(words.copy, props.name)}
				onAct={() => copy(props.text)}
			/>
		</InsetRing>
	);
}

/** Mono at the code role in the frame Code, Diff and ProseDiff share; never wraps, the text scrolling sideways inside the frame and taking a tab stop only when it does. A head names it (`title`) and carries the copy and download acts; without a title they stand side by side in a column beside the first line. `tail` folds the earlier lines behind a one-way act that reveals them and leaves, the focus landing on the text. */
export function Code({
	text: source,
	title,
	tail,
	copy,
	download,
	loading: own,
}: CodeProps) {
	const inherited = use(LoadingContext);
	const loading = own ?? inherited;
	const words = useWords();
	const id = useId();
	const [textNode, setTextNode] = useState<HTMLPreElement | null>(null);
	const scrolls = useScrolls(textNode, "x");
	const [unfolded, setUnfolded] = useState(false);
	const name = title ?? words.code;
	// The acts' name: the title, else the file the download saves.
	const actName = title ?? download;
	const acts = (
		<>
			{copy ? <CopyAct name={actName} text={source} /> : null}
			{download ? (
				<DownloadAct name={title ?? download} text={source} file={download} />
			) : null}
		</>
	);
	const head = title ? (
		<div className={cn(CODE_HEAD, HEAD)}>
			<span className={cn(text({ role: "meta" }), TITLE)}>{title}</span>
			{loading ? null : acts}
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
			// A keyboard scrolls the text sideways; one that fits is focusable by
			// script only (the fold lands on it), out of the tab order.
			tabIndex={scrolls ? 0 : -1}
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

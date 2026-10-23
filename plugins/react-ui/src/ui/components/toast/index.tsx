import { Toast as Control } from "@base-ui/react/toast";
import { TOAST_GLYPHS } from "@fcalell/ui-core/banner";
import { cn } from "@fcalell/ui-core/cn";
import type { LinkAct } from "@fcalell/ui-core/descriptors";
import type { Tone } from "@fcalell/ui-core/tokens";
import {
	LAYER_TOAST,
	TOAST,
	text,
	toastState,
} from "@fcalell/ui-core/variants";
import { use, useRef } from "react";
import type { Act } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { useFollow } from "../../lib/follow.ts";
import { ToastEntry } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import { ActFace } from "../button/face.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Icon } from "../icon/index.tsx";

// A swipe along the line is the toast's; the page keeps the vertical pan.
const BOX = "flex items-center max-w-full pointer-events-auto touch-pan-y";
// Each toast stands over the ones in front of it, Base UI's offset (their
// heights) plus a pair per toast in front (`translate`); `LAYER_TOAST` enters,
// leaves and closes it up.
const STACKED =
	"absolute bottom-0 right-0 -translate-y-[calc(var(--toast-offset-y)_+_var(--toast-index)_*_var(--spacing-gap))]";
const GLYPH = "flex shrink-0";
const SENTENCE = "min-w-0 grow shrink-10000000";
// The act gives way only once the sentence has (its shrink weight is 10^7 against
// the act's 1).
const ACT = "flex min-w-0 max-w-full";

/** A short report of how an act went. */
export interface ToastProps extends Closed {
	/** What happened (a sentence; wraps). */
	sentence: string;
	/** How the act it reports ended (`done`, the default): its glyph in the tone's ink. */
	tone?: Tone;
	/** A route (`{ label, href }`, an anchor) or a retry; never an undo. */
	act?: Act | LinkAct;
}

/** A raised toast: the tone's glyph, the sentence, its act and the dismiss act. It stands in the toasts' layer the Shell holds, which `toast()` queues it to; Base UI's toast pauses its timer under the pointer or focus, and a failed one is announced at once. On touch it follows a swipe toward the inline end 1:1 and leaves past the reach or flung, else settles back. */
export function Toast({ sentence, tone = "done", act }: ToastProps) {
	const words = useWords();
	const entry = use(ToastEntry);
	const { close } = Control.useToastManager();
	const root = useRef<HTMLDivElement>(null);
	const swipe = useFollow({
		target: root,
		axis: "x",
		away: "inline-end",
		enabled: true,
		onAway: () => entry && close(entry.id),
	});
	if (!entry)
		throw new Error(
			"a Toast stands in the Shell's toasts layer, queued by toast()",
		);
	// A failed (high priority) toast is announced by its own alert, and Base UI
	// hides the toast itself until it is focused so a polite region does not read
	// it twice. Its acts must stay reachable (a hidden subtree holding a focusable
	// act fails `aria-hidden-focus`), so the toast stays in the tree and turns
	// its own live region off instead: the alert is the one announcement.
	const alerted = entry.priority === "high";
	return (
		<Control.Root
			ref={root}
			toast={entry}
			// The swipe is `useFollow`'s, with the reach and the fling the phone has.
			swipeDirection={[]}
			onPointerDown={swipe.onPointerDown}
			onPointerMove={swipe.onPointerMove}
			onPointerUp={swipe.onPointerUp}
			onPointerCancel={swipe.onPointerCancel}
			aria-hidden={alerted ? false : undefined}
			aria-live={alerted ? "off" : undefined}
			className={cn(TOAST, BOX, STACKED, LAYER_TOAST)}
		>
			<span className={cn(toastState({ tone }), GLYPH)}>
				<Icon name={TOAST_GLYPHS[tone]} />
			</span>
			<Control.Title
				render={<span />}
				className={cn(text({ role: "body" }), SENTENCE)}
			>
				{sentence}
			</Control.Title>
			{act ? (
				<span className={ACT}>
					<ActFace
						act={act}
						kind="secondary"
						blocked={"blocked" in act ? act.blocked : undefined}
					/>
				</span>
			) : null}
			{/* Base UI hides the close act while the stack is collapsed; ours is always drawn, so it stays in the tree. */}
			<Control.Close
				aria-hidden={false}
				render={<IconButtonBase icon="X" label={words.dismiss} />}
			/>
		</Control.Root>
	);
}

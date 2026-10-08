import { Toast as Control } from "@base-ui/react/toast";
import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import {
	TOAST,
	type ToastState,
	text,
	toastState,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { ToastEntry } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";

const BOX = "flex items-center max-w-full pointer-events-auto";
// Each toast stands over the ones in front of it, Base UI's offset (their
// heights) plus a pair per toast in front (`translate`). It enters rising a
// pair as it fades in (`transform`, opacity: ease-out) and leaves fading
// (ease-in, the fast rung); the stack closes up on `translate`
// (ease-in-out), so the two motions keep their own curves.
const STACKED =
	"absolute bottom-0 right-0 -translate-y-[calc(var(--toast-offset-y)_+_var(--toast-index)_*_var(--spacing-pair))]";
const MOTION =
	"transition-[translate,transform,opacity] duration-base [transition-timing-function:var(--ease-in-out),var(--ease-out),var(--ease-out)] data-starting-style:[transform:translateY(var(--spacing-pair))] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-in";
const GLYPH = "flex shrink-0";
const SENTENCE = "min-w-0 grow";
const ACT = "flex shrink-0";

// The glyph of each state a toast reports.
const MARK: Record<ToastState, IconName> = {
	done: "CircleCheck",
	attention: "TriangleAlert",
	failed: "CircleX",
};

/** A short report of how an act went. */
export interface ToastProps extends Closed {
	/** What happened (a sentence; wraps). */
	sentence: string;
	/** How the act it reports ended: its glyph in the state's ink. */
	state?: ToastState;
	/** A route or a retry; never an undo. */
	act?: Act;
}

/** A raised toast: the state's glyph, the sentence, its act and the dismiss act. It stands in the toasts' layer the Shell holds, which `toast()` queues it to; Base UI's toast pauses its timer under the pointer or focus, and a failed one is announced at once. */
export function Toast({ sentence, state, act }: ToastProps) {
	const words = useWords();
	const entry = use(ToastEntry);
	if (!entry)
		throw new Error(
			"a Toast stands in the Shell's toasts layer, queued by toast()",
		);
	return (
		<Control.Root toast={entry} className={cn(TOAST, BOX, STACKED, MOTION)}>
			{state ? (
				<span className={cn(toastState({ state }), GLYPH)}>
					<Icon name={MARK[state]} />
				</span>
			) : null}
			<Control.Title
				render={<span />}
				className={cn(text({ role: "body" }), SENTENCE)}
			>
				{sentence}
			</Control.Title>
			{act ? (
				<span className={ACT}>
					<Button
						act="secondary"
						fit="bar"
						label={act.label}
						onAct={() => void act.onAct()}
						loading={act.loading}
						blocked={act.blocked}
					/>
				</span>
			) : null}
			<Control.Close
				render={<IconButtonBase icon="X" fit="bar" label={words.dismiss} />}
			/>
		</Control.Root>
	);
}

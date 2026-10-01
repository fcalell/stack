import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { StatusState } from "@fcalell/ui-core/tokens";
import {
	PILL_ACT,
	STATUS,
	STATUS_LABEL,
	statusDot,
} from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { useWords } from "../../lib/words.tsx";

const BOX = "inline-flex items-center min-w-0";
const OPEN =
	"inline-flex items-center min-w-0 -mx-inside hover:bg-wash-hover active:bg-wash-press";
const DOT = "shrink-0";
const WORD = "truncate";

/** A work state: a dot in the state's colour beside its word. */
export interface StatusProps extends Closed {
	/** The state the dot's colour and the default word name. */
	state: StatusState;
	/** The word, when the state's own word does not say it. */
	label?: string;
	/** Makes the status a pill that opens a menu of the states to move to. */
	onOpen?: () => void;
}

/** A dot and a word; with `onOpen` a button that pulls back by its own padding. */
export function Status({ state, label, onOpen }: StatusProps) {
	const words = useWords();
	const inner = (
		<>
			<span aria-hidden className={cn(statusDot({ state }), DOT)} />
			<span className={cn(STATUS_LABEL, WORD)}>{label ?? words[state]}</span>
		</>
	);
	if (!onOpen) return <span className={cn(STATUS, BOX)}>{inner}</span>;
	// Always a menu, of the status's transitions; a listbox or dialog is another molecule's.
	return (
		<BaseButton
			aria-haspopup="menu"
			onClick={onOpen}
			className={cn(STATUS, PILL_ACT, OPEN)}
		>
			{inner}
		</BaseButton>
	);
}

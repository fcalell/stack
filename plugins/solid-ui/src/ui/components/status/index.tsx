import type { StatusState } from "@fcalell/ui-core/tokens";
import { STATUS_CHIP, status } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { StatusGlyph } from "#lib/status-glyph";
import { useWords } from "#lib/words";

// An icon and a word; the consumer maps its own states onto the six and the
// color follows the state. With `onOpen` it is a 44 px chip.
export type StatusProps = Closed & {
	state: StatusState;
	label?: string;
	onOpen?: () => void;
};

export function Status(props: StatusProps) {
	const words = useWords();
	const word = () => props.label ?? words[props.state];
	const inner = () => (
		<>
			<StatusGlyph state={props.state} />
			<span>{word()}</span>
		</>
	);
	return (
		<Show
			when={props.onOpen}
			fallback={
				<span
					class={cn(status({ state: props.state }), "inline-flex items-center")}
				>
					{inner()}
				</span>
			}
		>
			<button
				type="button"
				onClick={() => props.onOpen?.()}
				class={cn(
					status({ state: props.state }),
					STATUS_CHIP,
					"inline-flex cursor-pointer items-center transition-colors duration-(--duration-fast) ease-ui hover:bg-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint",
				)}
			>
				{inner()}
			</button>
		</Show>
	);
}

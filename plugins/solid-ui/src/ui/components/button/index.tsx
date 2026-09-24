import {
	BUTTON_MUTED,
	BUTTON_MUTED_LABEL,
	type ButtonAct,
	button,
	buttonContentTone,
	buttonLabel,
	text,
} from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { Spinner } from "../spinner/index.tsx";

// A pill with words. Full width in an action bar, its content's width in a
// toolbar: the container decides. `blocked` is the reason, drawn under it,
// and the button is disabled while it holds.
export type ButtonProps = Closed & {
	act?: ButtonAct;
	label: string;
	onAct?: () => void;
	loading?: boolean;
	blocked?: string;
};

// Hover and press move the ground, never the alpha: fading a filled control
// composites its label with its own fill and drops the contrast the contract
// guarantees.
const GROUND: Record<ButtonAct, string> = {
	primary: "hover:bg-ink-meta active:bg-ink-meta",
	secondary: "hover:bg-edge active:bg-edge",
	destructive: "hover:bg-danger-soft active:bg-danger-soft",
};

const SHELL =
	"inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-colors duration-(--duration-fast) ease-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint disabled:cursor-not-allowed";

export function Button(props: ButtonProps) {
	const act = () => props.act ?? "primary";
	const blocked = () => props.blocked !== undefined;
	return (
		<div class="flex flex-col gap-pair">
			<button
				type="button"
				disabled={blocked() || props.loading}
				onClick={() => props.onAct?.()}
				class={cn(
					button({ act: act() }),
					buttonLabel({ act: act() }),
					SHELL,
					blocked() ? cn(BUTTON_MUTED, BUTTON_MUTED_LABEL) : GROUND[act()],
				)}
			>
				<Show when={props.loading}>
					<Spinner />
				</Show>
				{props.label}
			</button>
			<Show when={props.blocked}>
				<p class={cn(text({ role: "meta" }), "text-center")}>{props.blocked}</p>
			</Show>
		</div>
	);
}

// The tone a busy button's spinner inherits, for a consumer's `ui/`.
export { buttonContentTone };

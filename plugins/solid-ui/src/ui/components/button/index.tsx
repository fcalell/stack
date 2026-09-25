import {
	BUTTON_MUTED,
	BUTTON_MUTED_LABEL,
	type ButtonAct,
	button,
	buttonContentTone,
	buttonLabel,
	text,
} from "@fcalell/ui-core/variants";
import { createEffect, createSignal, createUniqueId, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { BAR_HIT, useFit } from "#lib/fit.ts";
import { useTouched } from "#lib/touched.ts";
import { Spinner } from "../spinner/index.tsx";

// A pill with words. Full width in an action bar, its content's width in a
// toolbar, compact in a top bar with its 44 px hit area kept: the container
// decides. `blocked` is the reason: the button is disabled while it holds,
// and the reason is drawn under it once the button is tapped or its form or
// sheet is touched.
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
	"inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-colors duration-(--duration-fast) ease-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";

export function Button(props: ButtonProps) {
	const act = () => props.act ?? "primary";
	const fit = useFit();
	const touched = useTouched();
	const reason = createUniqueId();
	const [tapped, setTapped] = createSignal(false);
	const blocked = () => props.blocked !== undefined;
	const said = () => blocked() && (tapped() || touched());
	createEffect(() => {
		if (!blocked()) setTapped(false);
	});
	return (
		<div class="flex flex-col gap-pair">
			{/* A blocked button stays focusable and takes a tap, which says why. */}
			<button
				type="button"
				disabled={props.loading}
				aria-disabled={blocked() || undefined}
				aria-describedby={said() ? reason : undefined}
				onClick={() => {
					if (blocked()) setTapped(true);
					else props.onAct?.();
				}}
				class={cn(
					button({ act: act(), fit }),
					buttonLabel({ act: act(), fit }),
					SHELL,
					fit === "bar" && BAR_HIT,
					blocked() ? cn(BUTTON_MUTED, BUTTON_MUTED_LABEL) : GROUND[act()],
				)}
			>
				<Show when={props.loading}>
					<Spinner />
				</Show>
				{props.label}
			</button>
			<Show when={said()}>
				<p id={reason} class={cn(text({ role: "meta" }), "text-center")}>
					{props.blocked}
				</p>
			</Show>
		</div>
	);
}

// The tone a busy button's spinner inherits, for a consumer's `ui/`.
export { buttonContentTone };

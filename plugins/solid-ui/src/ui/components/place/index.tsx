import type { Act, IconAct } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { Ellipsis } from "lucide-solid";
import { createSignal, For, type JSX, Show } from "solid-js";
import { Circle } from "#lib/circle.tsx";
import type { Closed } from "#lib/closed.ts";
import { useWords } from "#lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { ListRow } from "../list-row/index.tsx";
import { Sheet } from "../sheet/index.tsx";

// A place of the shell: the large title in the body, at most two actions as
// circles with the rest under a more circle, and the place's primary act as a
// pill floating above the tab bar on the phone, in the top bar from tablet.
export type PlaceProps = Closed & {
	title: string;
	actions?: IconAct<string>[];
	act?: Act;
	children?: JSX.Element;
};

const SHOWN = 2;

export function Place(props: PlaceProps) {
	const words = useWords();
	const [more, setMore] = createSignal(false);
	const shown = () => (props.actions ?? []).slice(0, SHOWN);
	const rest = () => (props.actions ?? []).slice(SHOWN);
	return (
		<div class="relative flex min-h-0 flex-1 flex-col">
			<header class="flex min-h-14 items-center justify-end gap-row px-inset tablet:px-section">
				<Show when={props.act}>
					{(act) => (
						<div class="hidden tablet:block">
							<Button
								act="primary"
								label={act().label}
								onAct={act().onAct}
								blocked={act().blocked}
								loading={act().loading}
							/>
						</div>
					)}
				</Show>
				<For each={shown()}>
					{(action) => (
						<IconButton
							icon={action.icon}
							label={action.label}
							onAct={action.onAct}
						/>
					)}
				</For>
				<Show when={rest().length > 0}>
					<Circle
						glyph={Ellipsis}
						label={words.more}
						onAct={() => setMore(true)}
					/>
				</Show>
			</header>
			<div class="flex min-h-0 flex-1 flex-col gap-section overflow-y-auto px-inset pb-section tablet:px-section">
				<h1 class={text({ role: "title" })}>{props.title}</h1>
				{props.children}
			</div>
			<Show when={props.act}>
				{(act) => (
					<div class="absolute right-inset bottom-inset tablet:hidden">
						<Button
							act="primary"
							label={act().label}
							onAct={act().onAct}
							blocked={act().blocked}
							loading={act().loading}
						/>
					</div>
				)}
			</Show>
			<Sheet open={more()} onClose={() => setMore(false)} title={props.title}>
				<For each={rest()}>
					{(action) => (
						<ListRow
							leading={{ icon: action.icon }}
							title={action.label}
							onOpen={() => {
								setMore(false);
								action.onAct();
							}}
						/>
					)}
				</For>
			</Sheet>
		</div>
	);
}

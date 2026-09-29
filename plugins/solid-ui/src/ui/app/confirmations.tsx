import { createEffect, createSignal, on, Show } from "solid-js";
import {
	type ConfirmEntry,
	confirmations,
	settleConfirmation,
} from "#lib/confirm.ts";
import { ActionBar } from "../components/action-bar/index.tsx";
import { Button } from "../components/button/index.tsx";
import { Form } from "../components/form/index.tsx";
import { FormField } from "../components/form-field/index.tsx";
import { Input } from "../components/input/index.tsx";
import { Sheet } from "../components/sheet/index.tsx";

// The first queued decision as a sheet: the sentence under the title, the
// name field when the act asks for one, and the act, blocked with its reason
// until the typed name matches. The last decision stays drawn while the sheet
// closes, so its content does not vanish under the animation; the sheet gives
// focus back to what held it.
export function Confirmations() {
	const current = () => confirmations()[0];
	const [shown, setShown] = createSignal<ConfirmEntry>();
	const [typed, setTyped] = createSignal("");
	createEffect(
		on(
			() => current()?.id,
			() => {
				const entry = current();
				if (entry) setShown(entry);
				setTyped("");
			},
		),
	);
	return (
		<Show when={shown()}>
			{(entry) => {
				const matches = () => {
					const name = entry().confirmName;
					return name === undefined || typed().trim() === name.value;
				};
				const take = () => {
					if (matches()) settleConfirmation(entry().id, true);
				};
				return (
					<Sheet
						open={current() !== undefined}
						onClose={() => settleConfirmation(entry().id, false)}
						title={entry().title}
						description={entry().sentence}
					>
						<Form onSubmit={take}>
							<Show when={entry().confirmName}>
								{(name) => (
									<FormField label={name().label}>
										<Input kind="source" value={typed()} onChange={setTyped} />
									</FormField>
								)}
							</Show>
							<ActionBar>
								<Button
									act={entry().act.destructive ? "destructive" : "primary"}
									label={entry().act.label}
									blocked={matches() ? undefined : entry().confirmName?.blocked}
									onAct={take}
								/>
							</ActionBar>
						</Form>
					</Sheet>
				);
			}}
		</Show>
	);
}

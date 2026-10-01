import { useEffect, useState } from "react";
import {
	type ConfirmEntry,
	settleConfirmation,
	useConfirmations,
} from "../../lib/confirm";
import { ActionBar } from "../action-bar";
import { Form } from "../form";
import { FormField } from "../form-field";
import { Input } from "../input";
import { Sheet } from "../sheet";

// The first queued decision as a sheet: the sentence under the title, the
// name field when the act asks for one, and the act as the form's bar,
// blocked with its reason until the typed name matches (a destructive act is
// the bar's danger fill). The last decision stays drawn while the sheet
// slides away.
export function Confirmations() {
	const current = useConfirmations()[0];
	const [shown, setShown] = useState<ConfirmEntry | undefined>(current);
	const [typed, setTyped] = useState("");
	useEffect(() => {
		if (current) setShown(current);
		setTyped("");
	}, [current]);
	if (!shown) return null;
	const name = shown.confirmName;
	const matches = name === undefined || typed.trim() === name.value;
	return (
		<Sheet
			open={current !== undefined}
			onClose={() => settleConfirmation(shown.id, false)}
			title={shown.title}
			description={shown.sentence}
		>
			<Form>
				{name ? (
					<FormField label={name.label}>
						<Input kind="source" value={typed} onChange={setTyped} />
					</FormField>
				) : null}
				<ActionBar
					acts={[
						{
							label: shown.act.label,
							destructive: shown.act.destructive,
							blocked: matches ? undefined : name?.blocked,
							onAct: () => settleConfirmation(shown.id, true),
						},
					]}
				/>
			</Form>
		</Sheet>
	);
}

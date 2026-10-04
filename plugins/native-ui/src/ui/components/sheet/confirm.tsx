import { useState } from "react";
import {
	type ConfirmEntry,
	dismissConfirmation,
	useConfirmations,
} from "../../lib/confirm";
import { FieldFocus } from "../../lib/field";
import { useWords } from "../../lib/words";
import { FormField } from "../form-field";
import { Input } from "../input";
import { SheetBase } from "./base";

// One decision as a bottom sheet: the sentence under the title and the act
// over Cancel in the foot (a destructive act the danger fill), Cancel its one
// dismissing act. The act runs the work: pending while its promise pends,
// Cancel and the scrim inert; the sheet closes when it resolves and stays
// open, the act ready again, when it rejects. A decision that asks for a name draws its
// field in the body, the act blocked on its reason until the name typed
// matches, the field taking focus as the sheet opens.
function ConfirmSheet({
	entry,
	open,
	onDone,
}: {
	entry: ConfirmEntry;
	open: boolean;
	onDone: () => void;
}) {
	const words = useWords();
	const [pending, setPending] = useState(false);
	const [typed, setTyped] = useState("");
	// A new decision starts from an empty field and a ready act, reset during
	// render; a sheet that is leaving keeps its decision's state until it is gone.
	const [decision, setDecision] = useState(entry.id);
	if (decision !== entry.id) {
		setDecision(entry.id);
		setTyped("");
		setPending(false);
	}
	const dismiss = () => {
		if (!pending) onDone();
	};
	// A failed act keeps the sheet open to retry; its caller says why.
	const run = () => {
		setPending(true);
		return entry.act
			.onAct()
			.then(onDone, () => {})
			.finally(() => setPending(false));
	};
	const name = entry.confirmName;
	const blocked =
		name && typed.trim() !== name.value ? name.blocked : undefined;
	return (
		<SheetBase
			open={open}
			onClose={dismiss}
			busy={pending}
			title={entry.title}
			description={entry.sentence}
			acts={[
				{ label: words.cancel, onAct: dismiss },
				{
					label: entry.act.label,
					destructive: entry.act.destructive,
					blocked,
					onAct: run,
				},
			]}
		>
			{name ? (
				<FieldFocus.Provider value>
					<FormField label={name.label}>
						<Input kind="source" value={typed} onChange={setTyped} />
					</FormField>
				</FieldFocus.Provider>
			) : null}
		</SheetBase>
	);
}

// The first queued decision; the last one stays drawn while its sheet
// slides away.
export function Confirmations() {
	const current = useConfirmations()[0];
	const [last, setLast] = useState(current);
	if (current && current !== last) setLast(current);
	const shown = current ?? last;
	if (!shown) return null;
	return (
		<ConfirmSheet
			entry={shown}
			open={current !== undefined}
			onDone={() => dismissConfirmation(shown.id)}
		/>
	);
}

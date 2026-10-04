import { useState } from "react";
import {
	type ConfirmEntry,
	dismissConfirmation,
	useConfirmations,
} from "../../lib/confirm.ts";
import { useWords } from "../../lib/words.tsx";
import { FormField } from "../form-field/index.tsx";
import { Input } from "../input/index.tsx";
import { SheetBase } from "./base.tsx";

/** One decision: centred on the desktop, a bottom sheet on touch, the sentence under the title and the act after Cancel (a destructive act the danger fill). The act runs the work: pending while its promise pends, the sheet's other acts and its dismissal inert; the sheet closes when it resolves and stays open, the act ready again, when it rejects. A decision that asks for a name draws its field over the acts, the act blocked on its reason until the name typed matches. Outside the package's exports: the Shell draws the queue's first. */
export function ConfirmSheet(props: {
	entry: ConfirmEntry;
	open: boolean;
	onDone: () => void;
}) {
	const { entry, open, onDone } = props;
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
	const words = useWords();
	const name = entry.confirmName;
	const blocked = name && typed !== name.value ? name.blocked : undefined;
	return (
		<SheetBase
			form="centred"
			open={open}
			onClose={dismiss}
			busy={pending}
			focus={name ? "field" : undefined}
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
				<FormField label={name.label}>
					<Input value={typed} onChange={setTyped} />
				</FormField>
			) : null}
		</SheetBase>
	);
}

/** The first queued decision; the last one stays drawn while its sheet closes. */
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

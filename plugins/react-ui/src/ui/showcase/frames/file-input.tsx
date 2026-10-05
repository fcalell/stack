import { FileInput } from "../../components/file-input/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const change = () => {};
const ACCEPT = ["text/csv", ".har"];
const CHOSEN = {
	name: "leads-q3.csv",
	size: 48_200,
	type: "text/csv",
	blob: () => Promise.resolve(new Blob()),
};

// A file control stands in a `FormField`, which labels it and draws the error
// line a refused file lands in; the frame's `error` and `disabled` reach the
// control through it. `FIELD.state.error` is in error in every state. The
// cells that draw the box's own parts stand empty (the word in its placeholder
// ink, the whole box the act), and the focus state, whose ring is the box's
// alone (a forced frame would ring the remove act as well); the rest hold a
// chosen file, its size after the name and the act that removes it.
export function drawFileInput(frame: ShowcaseFrame) {
	const name = frame.cell.name;
	const empty =
		frame.state === "empty" ||
		frame.state === "error" ||
		frame.state === "focus" ||
		name === "FIELD.trailing.none" ||
		name === "FIELD.state.error" ||
		name === "FIELD_PLACEHOLDER";
	const error = frame.state === "error" || name === "FIELD.state.error";
	return (
		<FormField
			label="Leads file"
			error={error ? "Choose a CSV or HAR file." : undefined}
			disabled={frame.state === "disabled"}
		>
			<FileInput
				value={empty ? null : CHOSEN}
				onChange={change}
				accept={ACCEPT}
			/>
		</FormField>
	);
}

import { Field } from "@base-ui/react/field";
import { text } from "@fcalell/ui-core/variants";
import { FileInput } from "../../components/file-input/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const change = () => {};
const ACCEPT = ["text/csv", ".har"];
const CHOSEN = {
	name: "leads-q3.csv",
	size: 48_200,
	type: "text/csv",
	blob: () => Promise.resolve(new Blob()),
};

// The frame's `error` and `disabled` reach the control through Base UI's
// `Field`, as a `FormField` puts them; `FIELD.state.error` is in error in
// every state. The cells that draw the box's own parts stand empty (the word
// in its placeholder ink, the whole box the act); the rest hold a chosen
// file, its size after the name and the act that removes it.
export function drawFileInput(frame: ShowcaseFrame) {
	const name = frame.cell.name;
	const empty =
		frame.state === "empty" ||
		frame.state === "error" ||
		name === "FIELD.trailing.none" ||
		name === "FIELD.state.error" ||
		name === "FIELD_PLACEHOLDER";
	return (
		<Field.Root
			invalid={frame.state === "error" || name === "FIELD.state.error"}
			disabled={frame.state === "disabled"}
		>
			<Field.Label className={text({ role: "body" })}>Leads file</Field.Label>
			<FileInput
				value={empty ? null : CHOSEN}
				onChange={change}
				accept={ACCEPT}
			/>
		</Field.Root>
	);
}

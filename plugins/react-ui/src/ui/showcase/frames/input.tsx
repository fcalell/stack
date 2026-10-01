import { Field } from "@base-ui/react/field";
import { text } from "@fcalell/ui-core/variants";
import { Input, type InputKind } from "../../components/input/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const change = () => {};

const KINDS: Partial<Record<string, InputKind>> = {
	"FIELD.fit.bar": "search",
	"FIELD_VALUE.kind.text": "text",
	"FIELD_VALUE.kind.code": "source",
	"FIELD_VALUE.kind.search": "search",
	"FIELD.trailing.act": "source",
};

const VALUES: Record<InputKind, string> = {
	text: "acme-inc",
	source: "whsec_8b1f4e2a9c7d3f06",
	search: "deploy failed",
	secret: "",
	number: "250",
	email: "",
};

// The frame's `error` and `disabled` reach the control through Base UI's
// `Field`, as a `FormField` puts them; `FIELD.state.error` is in error in
// every state. `FIELD.trailing.act` draws the in-field copy act, and
// `FIELD.trailing.none` a number with its unit.
export function drawInput(frame: ShowcaseFrame) {
	const name = frame.cell.name;
	const unit = name === "FIELD.trailing.none";
	const kind = unit ? "number" : (KINDS[name] ?? "text");
	return (
		<Field.Root
			invalid={frame.state === "error" || name === "FIELD.state.error"}
			disabled={frame.state === "disabled"}
		>
			{kind === "search" ? null : (
				<Field.Label className={text({ role: "body" })}>
					Workspace URL
				</Field.Label>
			)}
			<Input
				kind={kind}
				value={VALUES[kind]}
				onChange={change}
				unit={unit ? "ms" : undefined}
				act={
					name === "FIELD.trailing.act"
						? { icon: "Copy", label: "Copy", onAct: change }
						: undefined
				}
			/>
		</Field.Root>
	);
}

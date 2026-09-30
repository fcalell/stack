import { Field } from "@base-ui/react/field";
import { text } from "@fcalell/ui-core/variants";
import { TextArea } from "../../components/text-area/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const change = () => {};
const SHORT = "Marketing site for the launch.";
const LONG = [
	"Marketing site for the launch.",
	"Owns pricing and the changelog.",
	"Deploys from main on each merge.",
	"Previews post to the web channel.",
	"Archive after the launch review.",
].join("\n");

// The frame's `error` and `disabled` reach the control through Base UI's
// `Field`, as a `FormField` puts them. `TEXT_AREA.state.error` is in error in
// every state; `TEXT_AREA_BUDGET.state.error` is over its budget, the rest
// under it; `FIELD_VALUE.kind.code` is `source`, and `search` has no form.
export function drawTextArea(frame: ShowcaseFrame) {
	const name = frame.cell.name;
	if (name === "FIELD_VALUE.kind.search") return undefined;
	const over = name === "TEXT_AREA_BUDGET.state.error";
	return (
		<Field.Root
			invalid={frame.state === "error" || name === "TEXT_AREA.state.error"}
			disabled={frame.state === "disabled"}
		>
			<Field.Label className={text({ role: "body" })}>Description</Field.Label>
			<TextArea
				kind={name === "FIELD_VALUE.kind.code" ? "source" : "prose"}
				value={over ? LONG : SHORT}
				onChange={change}
				budget={over ? 20 : 200}
			/>
		</Field.Root>
	);
}

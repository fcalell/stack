import { Field } from "@base-ui/react/field";
import { text } from "@fcalell/ui-core/variants";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { TextArea } from "../../components/text-area/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Column } from "./place.tsx";

const change = () => {};
const SHORT = "Marketing site for the launch.";
const LONG = [
	"Marketing site for the launch.",
	"Owns pricing and the changelog.",
	"Deploys from main on each merge.",
	"Previews post to the web channel.",
	"Archive after the launch review.",
].join("\n");
const SOURCE = Array.from(
	{ length: 40 },
	(_, line) => `line ${line + 1} of the page's source`,
).join("\n");

// The frame's `error` and `disabled` reach the control through Base UI's
// `Field`, as a `FormField` puts them. `TEXT_AREA.state.error` is in error in
// every state; `TEXT_AREA_BUDGET.state.error` is over its budget, the rest
// under it; `FIELD_VALUE.kind.code` is `source` in a page's `Form`, which
// fills the page's height and scrolls its long value inside; `search` has no
// form.
export function drawTextArea(frame: ShowcaseFrame) {
	const name = frame.cell.name;
	if (name === "FIELD_VALUE.kind.search") return undefined;
	if (name === "FIELD_VALUE.kind.code")
		return (
			<Column>
				<div className="flex flex-col h-dvh">
					<Place title="Page source">
						<Form>
							<FormField
								label="Source"
								disabled={frame.state === "disabled"}
								error={
									frame.state === "error" ? "Not valid markdown." : undefined
								}
							>
								<TextArea kind="source" value={SOURCE} onChange={change} />
							</FormField>
							<ActionBar
								acts={[
									{ label: "Discard", onAct: change },
									{ label: "Save", onAct: change },
								]}
							/>
						</Form>
					</Place>
				</div>
			</Column>
		);
	const over = name === "TEXT_AREA_BUDGET.state.error";
	return (
		<Field.Root
			invalid={frame.state === "error" || name === "TEXT_AREA.state.error"}
			disabled={frame.state === "disabled"}
		>
			<Field.Label className={text({ role: "body" })}>Description</Field.Label>
			<TextArea
				value={over ? LONG : SHORT}
				onChange={change}
				budget={over ? 20 : 200}
			/>
		</Field.Root>
	);
}

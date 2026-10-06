import { text } from "@fcalell/ui-core/variants";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Banner } from "../../components/banner/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { Gate } from "../../components/gate/index.tsx";
import { Group } from "../../components/group/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";

const act = () => {};

// The product's mark, inline so the frame needs no asset pipeline.
export const MARK = {
	src: `data:image/svg+xml,${encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="#2f3a45"/><path d="M14 46 32 14l18 32h-9l-9-17-9 17z" fill="#9fb7c9"/></svg>',
	)}`,
	name: "Acme",
};

// The frame draws the page as the Shell's frames draw theirs, a viewport tall.
const BOX = "flex flex-col gap-pair";

// The held cells the frame names: the page, the column, its rhythm, the lead,
// the head and the mark.
const CELLS =
	"GATE · GATE_COLUMN · GATE_FLOW · GATE_LEAD · GATE_HEAD · GATE_MARK";

// Every cell draws the gate whole: its banner, mark, step count, head and a
// body of rows over a bar, none of it a typing control, so nothing takes focus
// on the frames page. The caption names the cells it holds.
export function drawGate(_frame: ShowcaseFrame) {
	return (
		<div className={BOX}>
			<p className={text({ role: "caption" })}>{CELLS}</p>
			<Gate
				mark={MARK}
				step={{ at: 1, of: 2 }}
				title="Choose a workspace"
				description={["Signed in as ", { strong: "ana@acme.dev" }]}
				banner={<Banner kind="warn" sentence="This request has expired." />}
			>
				<Group>
					<StandInRows ground="group" />
				</Group>
				<Form>
					<ActionBar acts={[{ label: "Continue", onAct: act }]} />
				</Form>
			</Gate>
		</div>
	);
}

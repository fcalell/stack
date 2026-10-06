import { text } from "@fcalell/ui-core/variants";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Banner } from "../../components/banner/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { Gate } from "../../components/gate/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { confirm } from "../../lib/confirm.ts";
import { toast } from "../../lib/toast.ts";
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
// the head and the mark; each case adds what it draws.
const CELLS =
	"GATE · GATE_COLUMN · GATE_FLOW · GATE_LEAD · GATE_HEAD · GATE_MARK";
// What a cell's case adds, by cell.
const CASES: Record<string, string> = {
	"TEXT_STRONG.role.meta": "a mark with no image: its name in its place",
	"TEXT.role.meta": "toast() and confirm() from inside the gate",
};

const NAME_ONLY = { name: MARK.name };

// The two acts of the raising case: one tells, one asks. The decision's act
// tells once its work resolves, as the layouts' do.
const remind = () => toast("We will ask again tomorrow.");
const disconnect = () =>
	confirm({
		title: "Disconnect Acme?",
		sentence:
			"Its deploys stop reading from this workspace until you connect it again.",
		act: {
			label: "Disconnect",
			destructive: true,
			onAct: async () => toast("Acme disconnected", { state: "done" }),
		},
	});

// The title cell draws the whole gate: its banner, mark, step count, head and
// a body of rows over a bar, none of it a typing control, so nothing takes
// focus on the frames page. The strong meta cell draws it with the mark's
// name alone (the name draws in that cell), the meta cell with acts that
// raise a toast and a decision, which the gate's own host draws.
export function drawGate(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const raises = cell === "TEXT.role.meta";
	const named = cell === "TEXT_STRONG.role.meta";
	const note = CASES[cell];
	return (
		<div className={BOX}>
			<p className={text({ role: "caption" })}>
				{note ? `${CELLS} · ${note}` : CELLS}
			</p>
			<Gate
				mark={named ? NAME_ONLY : MARK}
				step={{ at: 1, of: 2 }}
				title="Choose a workspace"
				description={["Signed in as ", { strong: "ana@acme.dev" }]}
				banner={<Banner kind="warn" sentence="This request has expired." />}
			>
				<Group>
					<StandInRows ground="group" />
				</Group>
				<Form>
					<ActionBar
						acts={
							raises
								? [
										{ label: "Remind me later", onAct: remind, quiet: true },
										{
											label: "Disconnect",
											onAct: disconnect,
											destructive: true,
										},
									]
								: [{ label: "Continue", onAct: act }]
						}
					/>
				</Form>
			</Gate>
		</div>
	);
}

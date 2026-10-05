import { text } from "@fcalell/ui-core/variants";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { AuthColumn } from "../../components/auth-column/index.tsx";
import { Banner } from "../../components/banner/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { Group } from "../../components/group/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";

const act = () => {};

// The frame draws the page at the sheet's width in a box a page tall at most,
// scrolling, since the page fills the viewport.
const BOX = "flex flex-col gap-pair w-sheet max-w-full";
const SCROLL = "h-dvh max-h-[40rem] overflow-y-auto";

// The held cells the frame names: the page, the column and the head.
const CELLS = "AUTH_PAGE · AUTH_COLUMN · AUTH_HEAD";

// Every cell draws the column whole: its banner, product line, step count,
// head and a body of rows over a bar, none of it a typing control, so nothing
// takes focus on the frames page. The caption names the cells it holds.
export function drawAuthColumn(_frame: ShowcaseFrame) {
	return (
		<div className={BOX}>
			<p className={text({ role: "caption" })}>{CELLS}</p>
			<div className={SCROLL}>
				<AuthColumn
					product="Acme"
					step={{ at: 1, of: 2 }}
					title="Choose a workspace"
					sentence={["Signed in as ", { strong: "ana@acme.dev" }]}
					banner={<Banner kind="warn" sentence="This request has expired." />}
				>
					<Group>
						<StandInRows ground="group" />
					</Group>
					<Form>
						<ActionBar acts={[{ label: "Continue", onAct: act }]} />
					</Form>
				</AuthColumn>
			</div>
		</div>
	);
}

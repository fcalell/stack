import { List } from "../../components/list/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows, Wide } from "./layout-context.tsx";

// Every cell draws the List in the frame's state: rows at rest, the
// skeleton two-line rows loading.
export function drawList(frame: ShowcaseFrame) {
	return (
		<Wide>
			<List loading={frame.state === "loading"}>
				<StandInRows ground="list" />
			</List>
		</Wide>
	);
}

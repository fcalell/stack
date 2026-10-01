import { Group } from "../../components/group/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows, Wide } from "./layout-context.tsx";

// Every cell draws the Group in the frame's state: rows at rest, the
// skeleton setting rows loading.
export function drawGroup(frame: ShowcaseFrame) {
	return (
		<Wide>
			<Group loading={frame.state === "loading"}>
				<StandInRows ground="group" />
			</Group>
		</Wide>
	);
}

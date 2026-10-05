import { Stat } from "../../components/stat/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// The TV board's focal point: the count of what needs someone, its words after
// it. A `TEXT.role.meta` cell draws the unit form.
export function drawStat(frame: ShowcaseFrame) {
	if (frame.state === "loading") return <Stat label="" value={0} loading />;
	if (frame.cell.name === "TEXT.role.meta")
		return <Stat label="queue size" value={1284} unit="in todo" />;
	return <Stat label="need you" value={2} />;
}

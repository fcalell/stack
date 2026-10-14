import { Stat } from "../../components/stat/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waiting } from "../waiting.ts";
import { beside, isPaint } from "./painted.tsx";

// A figure that never arrives: a Stat given it stays painted.
const waitingFigure = waiting.at(() => 0);

// The TV board's focal point: the count of what needs someone, its words after
// it. A `TEXT.role.meta` cell draws the unit form.
export function drawStat(frame: ShowcaseFrame) {
	const painted = <Stat label="need you" value={waitingFigure} />;
	if (isPaint(frame))
		return beside(frame, <Stat label="need you" value={2} />, painted);
	if (frame.state === "loading") return painted;
	if (frame.cell.name === "TEXT.role.meta")
		return <Stat label="queue size" value={1284} unit="in todo" />;
	return <Stat label="need you" value={2} />;
}

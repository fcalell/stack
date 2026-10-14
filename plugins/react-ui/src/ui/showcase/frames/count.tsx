import { CountBase } from "../../components/count/base.tsx";
import { Count } from "../../components/count/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { beside, isPaint } from "./painted.tsx";

// The single-cell number: a one-, two- and three-digit value and zero.
// `PAINT.kind.glyphs` draws the number beside its painted form, a figure's filler.
export function drawCount(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(
			frame,
			<Count value={12} />,
			<CountBase value={12} painted />,
		);
	return (
		<span className="flex items-center gap-inside">
			<Count value={3} />
			<Count value={12} />
			<Count value={128} />
			<Count value={0} />
		</span>
	);
}

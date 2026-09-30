import type { ChipFamily } from "@fcalell/ui-core/tokens";
import { Chip } from "../../components/chip/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const remove = () => {};
const LONG =
	"A value long enough to reach the chip label's bound and truncate there";

// `CHIP.family.<family>` draws the family: at rest the plain chip over the
// removable one, in the pressable states the removable one. `CHIP.trailing`
// draws either end; `CHIP_LABEL.family.<family>` a label past its bound.
// `CHIP.trailing.none` and `CHIP_LABEL` have no pointer or focus form (those
// states belong to the remove act), so the frame draws the plain chip in
// every state, where it looks as it rests.
export function drawChip(frame: ShowcaseFrame) {
	const drawn = drawCell(frame);
	// items-start, so the frame's column does not stretch the inline marks.
	return (
		drawn && <div className="flex flex-col items-start gap-pair">{drawn}</div>
	);
}

function drawCell(frame: ShowcaseFrame) {
	const [cell, axis, value] = frame.cell.name.split(".");
	const rest = frame.state === "rest";
	if (cell === "CHIP" && axis === "family") {
		// The third segment of a `family` cell is a chip family key.
		const family = value as ChipFamily;
		if (!rest) return <Chip label="Design" family={family} onRemove={remove} />;
		return (
			<>
				<Chip label="Design" family={family} />
				<Chip label="Design" family={family} onRemove={remove} />
			</>
		);
	}
	if (cell === "CHIP" && axis === "trailing") {
		if (value === "remove")
			return <Chip label="Design" family="violet" onRemove={remove} />;
		return <Chip label="Design" family="violet" />;
	}
	if (cell === "CHIP_LABEL")
		// The third segment of a `CHIP_LABEL.family` cell is a chip family key.
		return <Chip label={LONG} family={value as ChipFamily} />;
	return undefined;
}

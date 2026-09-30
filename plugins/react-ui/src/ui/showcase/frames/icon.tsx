import type { IconFit } from "@fcalell/ui-core/variants";
import { Icon } from "../../components/icon/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const FITS: Partial<Record<string, IconFit>> = {
	"ICON.fit.meta": "meta",
	"ICON.fit.body": "body",
	"ICON.fit.control": "control",
};

// Each `ICON.fit` cell draws the glyph at that fit in a place whose ink is
// `ink-meta`, the ink it takes as currentColor.
export function drawIcon(frame: ShowcaseFrame) {
	const fit = FITS[frame.cell.name];
	if (!fit) return undefined;
	return (
		<span className="flex text-ink-meta">
			<Icon name="Layers" fit={fit} />
		</span>
	);
}

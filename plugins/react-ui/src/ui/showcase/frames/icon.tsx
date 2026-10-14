import type { IconFit } from "@fcalell/ui-core/variants";
import { Icon, IconBase } from "../../components/icon/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { beside, isPaint } from "./painted.tsx";

const FITS: Partial<Record<string, IconFit>> = {
	"ICON.fit.meta": "meta",
	"ICON.fit.body": "body",
	"ICON.fit.control": "control",
};

// Each `ICON.fit` cell draws the glyph at that fit in a place whose ink is
// `ink-meta`, the ink it takes as currentColor; `PAINT.kind.box` draws the
// glyph beside its painted box.
export function drawIcon(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(
			frame,
			<span className="flex text-ink-meta">
				<Icon name="Layers" />
			</span>,
			<IconBase name="Layers" stroke="line" painted />,
		);
	const fit = FITS[frame.cell.name];
	if (!fit) return undefined;
	return (
		<span className="flex text-ink-meta">
			<Icon name="Layers" fit={fit} />
		</span>
	);
}

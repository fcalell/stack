import { cn } from "@fcalell/ui-core/cn";
import { lineBox } from "@fcalell/ui-core/variants";
import { UNZOOM } from "./floor.ts";
import type { Box } from "./geometry.ts";

// A zero-width stand at the centre point: its flex item overflows both sides
// equally, so the text centres on the point at any width.
const STAND = "absolute w-0 flex justify-center pointer-events-none";
const TEXT =
	"shrink-0 w-max max-w-measure text-center text-ink-meta origin-top";

// The canvas's text, centred under the graph's bounds by a `gap`. It follows
// the pan and zoom with the layer and holds its own size on screen, so it
// stays at the text floor at any zoom, and it takes no pointer.
export function Caption({
	id,
	text,
	bounds,
	gap,
}: {
	id: string;
	text: string;
	bounds: Box;
	gap: number;
}) {
	return (
		<div
			// Its place is a coordinate of the flow, known at run time.
			style={{
				left: bounds.x + bounds.width / 2,
				top: bounds.y + bounds.height + gap,
			}}
			className={STAND}
		>
			<p id={id} style={UNZOOM} className={cn(lineBox({ role: "meta" }), TEXT)}>
				{text}
			</p>
		</div>
	);
}

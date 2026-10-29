import { QrCode } from "../../components/qr-code/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waitingText } from "../waiting.ts";

// A device's one-time address, the length an enrolment link runs to.
const ADDRESS =
	"https://home.example.ts.net/enrol/4f9c2a7e1b8d4c6f9a3e5b7d1c2f8a6e";
const LABEL = "Code that adds a device";
// A sheet's column: wider than the image's height cap on the desktop, so the
// tile narrows to the cap and stands centred in it; at 320 the column is the
// frame's width and the tile fills it.
const COLUMN = "flex w-dialog max-w-full flex-col";

// `PAINT.kind.box` draws the code at rest and its painted tile, the same
// square, while loading.
export function drawQrCode(frame: ShowcaseFrame) {
	if (frame.state !== "rest" && frame.state !== "loading") return undefined;
	return (
		<div className={COLUMN}>
			<QrCode
				value={frame.state === "loading" ? waitingText : ADDRESS}
				label={LABEL}
			/>
		</div>
	);
}

import { QrCode } from "../../components/qr-code/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waitingText } from "../waiting.ts";
import { beside, isPaint } from "./painted.tsx";

const LINK = "https://acme.dev/p/7KQ2XM";

// Board 54's tile: the code at rest, its square painted while loading, and a
// paint cell the code beside the painted tile.
export function drawQrCode(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return beside(
			frame,
			<QrCode value={LINK} />,
			<QrCode value={waitingText} />,
		);
	return <QrCode value={frame.state === "loading" ? waitingText : LINK} />;
}

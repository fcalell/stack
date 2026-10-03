import { QrCode } from "../../components/qr-code/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const LINK = "https://acme.dev/p/7KQ2XM";

// Board 54's tile: the code at rest, its square a skeleton while loading
// (the frame's state, or the `QR_CODE.state.loading` cell).
export function drawQrCode(frame: ShowcaseFrame) {
	const loading =
		frame.state === "loading" || frame.cell.name === "QR_CODE.state.loading";
	return <QrCode value={LINK} loading={loading} />;
}

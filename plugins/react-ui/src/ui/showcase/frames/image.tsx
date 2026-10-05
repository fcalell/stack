import type { ImageFit, ImageState } from "@fcalell/ui-core/variants";
import { Image } from "../../components/image/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { press, Stage } from "./overlay-stage.tsx";

// A captured page, inline so the frame needs no asset pipeline.
export const SCREEN = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800"><rect width="1280" height="800" fill="#f4f6f8"/><rect width="1280" height="64" fill="#2f3a45"/><rect x="32" y="20" width="160" height="24" rx="4" fill="#9fb7c9"/><rect x="64" y="128" width="520" height="40" rx="6" fill="#2f3a45"/><rect x="64" y="192" width="640" height="20" rx="4" fill="#9aa5b1"/><rect x="64" y="228" width="580" height="20" rx="4" fill="#9aa5b1"/><rect x="64" y="288" width="168" height="48" rx="8" fill="#5f7d93"/><rect x="720" y="128" width="496" height="360" rx="12" fill="#dde3e9"/><rect x="752" y="160" width="432" height="144" rx="8" fill="#9fb7c9"/><rect x="752" y="328" width="280" height="24" rx="4" fill="#9aa5b1"/><rect x="752" y="368" width="360" height="24" rx="4" fill="#9aa5b1"/><rect x="64" y="560" width="1152" height="176" rx="12" fill="#dde3e9"/></svg>',
)}`;
// The captured page's width over its height.
const SCREEN_ASPECT = 1280 / 800;
// An address that is no picture, so the load fails.
const BROKEN = "data:image/png;base64,AAAA";
const ALT = "Checkout page after the failed payment";
// The content fit stands at its container's width.
const COLUMN = "w-dialog max-w-full";

function drawn(fit: ImageFit, state: ShowcaseFrame["state"]) {
	const src = state === "error" ? BROKEN : SCREEN;
	const loading = state === "loading" || undefined;
	if (fit === "thumb")
		return <Image src={src} alt={ALT} fit="thumb" loading={loading} />;
	return (
		<div className={COLUMN}>
			<Image src={src} alt={ALT} aspect={SCREEN_ASPECT} loading={loading} />
		</div>
	);
}

const pressPicture = (stage: HTMLElement) =>
	requestAnimationFrame(() => press(stage.querySelector("button")));

// `IMAGE.fit.<fit>` draws the picture at that fit in the frame's state (the
// pointer and focus states forced by the frame, `loading` the skeleton, `error`
// the failed form); `IMAGE.state.<state>` both fits in that state and
// `IMAGE_PICTURE.fit.<fit>` the picture alone. The Close act's cell
// (`ICON_BUTTON.fit.body`) draws the full view opened, contain-fit on the
// scrim.
export function drawImage(frame: ShowcaseFrame) {
	const [family, axis, value] = frame.cell.name.split(".");
	if (family === "ICON_BUTTON" && frame.state === "rest")
		return (
			<Stage contain ready={pressPicture}>
				<Image src={SCREEN} alt={ALT} fit="thumb" />
			</Stage>
		);
	// The cell's name is `<family>.<axis>.<value>` over the matrices' own
	// axis values, so the value is an `ImageFit` or an image state.
	if (axis === "fit" && (family === "IMAGE" || family === "IMAGE_PICTURE"))
		return drawn(value as ImageFit, family === "IMAGE" ? frame.state : "rest");
	if (family === "IMAGE" && axis === "state")
		return (
			<>
				{drawn("thumb", value as ImageState)}
				{drawn("content", value as ImageState)}
			</>
		);
	return undefined;
}

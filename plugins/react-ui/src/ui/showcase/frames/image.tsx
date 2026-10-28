import type { ImageFit, ImageState } from "@fcalell/ui-core/variants";
import { Image } from "../../components/image/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waitingText } from "../waiting.ts";
import { press, Stage } from "./overlay-stage.tsx";
import { isPaint } from "./painted.tsx";

// A captured page, inline so the frame needs no asset pipeline.
export const SCREEN = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800"><rect width="1280" height="800" fill="#f4f6f8"/><rect width="1280" height="64" fill="#2f3a45"/><rect x="32" y="20" width="160" height="24" rx="4" fill="#9fb7c9"/><rect x="64" y="128" width="520" height="40" rx="6" fill="#2f3a45"/><rect x="64" y="192" width="640" height="20" rx="4" fill="#9aa5b1"/><rect x="64" y="228" width="580" height="20" rx="4" fill="#9aa5b1"/><rect x="64" y="288" width="168" height="48" rx="8" fill="#5f7d93"/><rect x="720" y="128" width="496" height="360" rx="12" fill="#dde3e9"/><rect x="752" y="160" width="432" height="144" rx="8" fill="#9fb7c9"/><rect x="752" y="328" width="280" height="24" rx="4" fill="#9aa5b1"/><rect x="752" y="368" width="360" height="24" rx="4" fill="#9aa5b1"/><rect x="64" y="560" width="1152" height="176" rx="12" fill="#dde3e9"/></svg>',
)}`;
// The captured page's width over its height.
const SCREEN_ASPECT = 1280 / 800;
// A square code, the edge a column wider than the height cap draws: its box
// narrows to the cap rather than cropping the code to it.
const CODE = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="420" height="420" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/><path d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0z" fill="#111"/><path d="M1 1h5v5H1zM15 1h5v5h-5zM1 15h5v5H1z" fill="#fff"/><path d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM9 1h2v2H9zM8 4h3v2H8zM10 8h3v3h-3zM14 9h2v4h-2zM17 10h3v2h-3zM8 14h2v3H8zM12 13h3v2h-3zM15 16h4v3h-4zM10 18h3v2h-3z" fill="#111"/></svg>',
)}`;
const CODE_ALT = "Code that adds a device";
// An address that is no picture, so the load fails.
const BROKEN = "data:image/png;base64,AAAA";
const ALT = "Checkout page after the failed payment";
// The content fit stands at its container's width, the pictures a gap apart.
const COLUMN = "flex w-dialog max-w-full flex-col gap-gap";

function drawn(fit: ImageFit, state: ShowcaseFrame["state"]) {
	const src = state === "error" ? BROKEN : SCREEN;
	// The address a read has not answered: the tile paints.
	const shown = state === "loading" ? waitingText : src;
	if (fit === "thumb") return <Image src={shown} alt={ALT} fit="thumb" />;
	const code = state === "rest" ? CODE : shown;
	return (
		<div className={COLUMN}>
			<Image src={shown} alt={ALT} aspect={SCREEN_ASPECT} />
			<Image src={code} alt={CODE_ALT} aspect={1} />
		</div>
	);
}

const pressPicture = (stage: HTMLElement) =>
	requestAnimationFrame(() => press(stage.querySelector("button")));

// `IMAGE.fit.<fit>` draws the picture at that fit in the frame's state
// (`loading` the painted tile, `error` the failed form); `IMAGE.state.<state>` both fits in that state and
// `IMAGE_PICTURE.fit.<fit>` the picture alone. The Close act's cell
// (`ICON_BUTTON.fit.body`) draws the full view opened, contain-fit on the
// scrim.
export function drawImage(frame: ShowcaseFrame) {
	const [family, axis, value] = frame.cell.name.split(".");
	if (isPaint(frame))
		return frame.state === "rest" ? (
			<>
				{drawn("thumb", "loading")}
				{drawn("content", "loading")}
			</>
		) : undefined;
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

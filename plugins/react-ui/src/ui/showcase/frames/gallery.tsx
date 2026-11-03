import { Gallery, type GalleryItem } from "../../components/gallery/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waitingText } from "../waiting.ts";
import { SCREEN } from "./image.tsx";
import { press, Stage } from "./overlay-stage.tsx";

// A phone's page, far taller than wide: its tile holds at three to four and
// crops from the top, where the page's head is.
const PHONE = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" width="390" height="844"><rect width="390" height="844" fill="#f4f6f8"/><rect width="390" height="56" fill="#2f3a45"/><rect x="16" y="18" width="120" height="20" rx="4" fill="#9fb7c9"/><rect x="16" y="88" width="300" height="32" rx="6" fill="#2f3a45"/><rect x="16" y="140" width="358" height="16" rx="4" fill="#9aa5b1"/><rect x="16" y="168" width="320" height="16" rx="4" fill="#9aa5b1"/><rect x="16" y="216" width="358" height="200" rx="12" fill="#dde3e9"/><rect x="16" y="440" width="358" height="200" rx="12" fill="#dde3e9"/><rect x="16" y="760" width="358" height="48" rx="8" fill="#5f7d93"/></svg>',
)}`;
// An address that is no picture, so the load fails.
const BROKEN = "data:image/png;base64,AAAA";

// A wide desktop shot, a phone shot and a long caption, which cuts to its
// tile's width.
const ITEMS = [
	{
		key: "checkout-1280",
		alt: "Checkout at 1280 px, dark",
		aspect: 1280 / 800,
		caption: "checkout-1280-dark.png",
		src: SCREEN,
	},
	{
		key: "checkout-320",
		alt: "Checkout at 390 px, light",
		aspect: 390 / 844,
		caption: "checkout-390-light.png",
		src: PHONE,
	},
	{
		key: "settings",
		alt: "Notification settings with every channel turned on",
		aspect: 1280 / 800,
		caption:
			"settings/notifications/every-channel-turned-on-1280-dark-after-the-redesign.png",
		src: SCREEN,
	},
] as const;

function drawn(state: ShowcaseFrame["state"]) {
	const items: GalleryItem[] = ITEMS.map((item, at) => ({
		...item,
		// The waiting form paints every tile; the failed form fails the second,
		// beside two that load.
		src:
			state === "loading"
				? waitingText
				: state === "error" && at === 1
					? BROKEN
					: item.src,
	}));
	return <Gallery items={items} />;
}

// The middle tile opened, so the view steps both ways.
const pressMiddle = (stage: HTMLElement) =>
	requestAnimationFrame(() => press(stage.querySelectorAll("button")[1]));

// The tile cells (`IMAGE.fit.tile`, `IMAGE_PICTURE.fit.tile`, the caption's
// `TEXT.role.meta`) draw the gallery in the frame's state: `loading` every
// tile painted, `error` one failed beside two loaded. The glyphs' cell
// (`ICON.fit.body`) draws the full view opened on the middle picture at rest,
// Previous and Next at its sides and Close at its corner, and the failed tile's
// glyph in `error`.
export function drawGallery(frame: ShowcaseFrame) {
	if (frame.cell.name !== "ICON.fit.body" || frame.state !== "rest")
		return drawn(frame.state);
	return (
		<Stage contain ready={pressMiddle}>
			{drawn("rest")}
		</Stage>
	);
}

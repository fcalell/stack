import type { BannerKind } from "@fcalell/ui-core/variants";
import { Banner } from "../../components/banner/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const act = () => {};
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act };
const TRIAL = "Your trial ends in 3 days.";
const UPGRADE = { label: "Upgrade", onAct: act };
const BLOCKED = { ...UPGRADE, blocked: "Only an owner can upgrade." };

const KINDS: Record<string, BannerKind> = {
	"BANNER.kind.note": "note",
	"BANNER_GLYPH.kind.note": "note",
	"BANNER.kind.warn": "warn",
	"BANNER_GLYPH.kind.warn": "warn",
	"BANNER.kind.danger": "danger",
	"BANNER_GLYPH.kind.danger": "danger",
};

// A kind's cells draw that kind; the other cells the board's column of
// kinds, no act and a wrapped sentence. `disabled` draws the blocked act
// before it is pressed and in a touched form with its reason shown.
export function drawBanner(frame: ShowcaseFrame) {
	if (frame.state === "disabled")
		return (
			<Wide>
				<Banner kind="warn" sentence={TRIAL} act={BLOCKED} />
				<TouchedContext value={TOUCHED}>
					<Banner kind="warn" sentence={TRIAL} act={BLOCKED} />
				</TouchedContext>
			</Wide>
		);
	const kind = KINDS[frame.cell.name];
	if (kind)
		return (
			<Wide>
				<Banner kind={kind} sentence={TRIAL} act={UPGRADE} />
			</Wide>
		);
	return (
		<Wide>
			<Banner
				sentence="Acme moves to the new build image on Oct 12."
				act={{ label: "Read more", onAct: act }}
			/>
			<Banner kind="warn" sentence={TRIAL} act={UPGRADE} />
			<Banner
				kind="danger"
				sentence="The last deploy of api failed."
				act={{ label: "Open logs", onAct: act }}
			/>
			<Banner sentence="Deploys are paused while the region is under maintenance." />
			<Banner
				kind="warn"
				sentence="Usage is at 92 % of the plan's build minutes; builds queue once it reaches the limit on Oct 31."
				act={{ label: "Upgrade", onAct: act }}
			/>
		</Wide>
	);
}

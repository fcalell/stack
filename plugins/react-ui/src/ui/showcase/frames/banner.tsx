import { createLeave } from "@fcalell/ui-core/leave";
import { TONES } from "@fcalell/ui-core/tokens";
import { Banner } from "../../components/banner/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const act = () => {};
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act, leave: createLeave() };
const TRIAL = "Your trial ends in 3 days.";
const UPGRADE = { label: "Upgrade", onAct: act };
const BLOCKED = { ...UPGRADE, blocked: "Only an owner can upgrade." };

const MINUTE = 60_000;

// A tone's cells draw that tone; the other cells a column of
// tones, no act and a wrapped sentence. `disabled` draws the blocked act
// before it is pressed and in a touched form with its reason shown;
// `pending` a run with a deadline: with its cancel, with a wrapped sentence
// and no act.
export function drawBanner(frame: ShowcaseFrame) {
	if (frame.state === "pending")
		return (
			<Wide>
				<Banner
					tone="running"
					sentence="Restoring the backup of Sep 30"
					until={new Date(Date.now() + MINUTE)}
					act={{ label: "Cancel", onAct: act }}
				/>
				<Banner
					tone="running"
					sentence="Copying 14,280 rows and 36 tables from acme-staging into acme-prod, then rebuilding the indexes"
					until={new Date(Date.now() + 2 * MINUTE)}
					act={{ label: "Cancel", onAct: act }}
				/>
				<Banner
					tone="running"
					sentence="Checking the DNS records"
					until={new Date(Date.now() + MINUTE)}
				/>
			</Wide>
		);
	if (frame.state === "disabled")
		return (
			<Wide>
				<Banner tone="attention" sentence={TRIAL} act={BLOCKED} />
				<TouchedContext value={TOUCHED}>
					<Banner tone="attention" sentence={TRIAL} act={BLOCKED} />
				</TouchedContext>
			</Wide>
		);
	const tone = TONES.find((one) => frame.cell.name.endsWith(`.tone.${one}`));
	if (tone)
		return (
			<Wide>
				<Banner tone={tone} sentence={TRIAL} act={UPGRADE} />
			</Wide>
		);
	return (
		<Wide>
			<Banner
				sentence="Acme moves to the new build image on Oct 12."
				act={{ label: "Read more", onAct: act }}
			/>
			<Banner tone="attention" sentence={TRIAL} act={UPGRADE} />
			<Banner
				tone="failed"
				sentence="The last deploy of api failed."
				act={{ label: "Open logs", onAct: act }}
			/>
			<Banner sentence="Deploys are paused while the region is under maintenance." />
			<Banner
				tone="attention"
				sentence="Usage is at 92 % of the plan's build minutes; builds queue once it reaches the limit on Oct 31."
				act={{ label: "Upgrade", onAct: act }}
			/>
		</Wide>
	);
}

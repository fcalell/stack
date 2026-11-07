import { createLeave } from "@fcalell/ui-core/leave";
import { TONES } from "@fcalell/ui-core/tokens";
import { Banner } from "../../components/banner/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { groundOf, Judged, ratio, rgbOf } from "./judged.tsx";
import { Wide } from "./layout-context.tsx";
import { hang, Pressed } from "./pending.tsx";

const act = () => {};
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act, leave: createLeave() };
const TRIAL = "Your trial ends in 3 days.";
const UPGRADE = { label: "Upgrade", onAct: act };
const BLOCKED = { ...UPGRADE, blocked: "Only an owner can upgrade." };
const REFRESHING = {
	label: "Refresh",
	onAct: act,
	blocked: "Knowledge is being refreshed.",
};

const MINUTE = 60_000;

// An act reads as a button on its banner's tone: its words hold 4.5:1 on the
// box it stands on, and the ring that bounds it holds 3:1 on the banner's
// ground, at every width and in both modes. A blocked act's words are the
// disabled ink, exempt from the text floor, so only its edge is judged.
function actFaults(host: Element): string[] {
	const faults: string[] = [];
	for (const banner of host.querySelectorAll<HTMLElement>(
		'[role="status"], [role="alert"]',
	)) {
		const button = banner.querySelector<HTMLElement>("button, a");
		const slot = button?.parentElement;
		if (!button || !slot || slot === banner) continue;
		const label = button.textContent?.trim() || "an act";
		const ground = groundOf(banner);
		const ring = rgbOf(
			getComputedStyle(slot).getPropertyValue("--tw-ring-color"),
		);
		const edge = ring && ring[3] > 0 ? ring : undefined;
		const on = groundOf(button);
		const ink = rgbOf(getComputedStyle(button).color);
		if (!edge || ratio(edge, ground) < 3)
			faults.push(
				`the act ${label} has no edge against its banner (${edge ? ratio(edge, ground).toFixed(2) : "none"}:1, wants 3:1)`,
			);
		if (
			button.getAttribute("aria-disabled") !== "true" &&
			ink &&
			ratio(ink, on) < 4.5
		)
			faults.push(
				`the act ${label} reads at ${ratio(ink, on).toFixed(2)}:1 on its box, wants 4.5:1`,
			);
	}
	return faults;
}

// A refused path in the sentence: runs, whose code stands boxed in the mono and
// wraps whole inside its box at 320.
const REFUSED = [
	"The lead cannot start: ",
	{ code: "/tmp/stead-fx-9180/leads/mail-nowhere" },
	" is not a directory.",
];

// A tone's cells draw that tone; the other cells a column of
// tones, no act and a wrapped sentence. `disabled` draws the blocked act
// before it is pressed and in a touched form with its reason shown, then on
// the caution's and the failure's tints (a blocked
// outlined act on a tint keeps the contrast floor);
// `pending` a run with a deadline: with its cancel, with a wrapped sentence
// and no act, then a caution and a failure whose act is pressed into one that
// never settles (the act pending on the tint).
export function drawBanner(frame: ShowcaseFrame) {
	return (
		<Judged name={`Banner ${frame.cell.name}`} judge={actFaults}>
			{drawn(frame)}
		</Judged>
	);
}

function drawn(frame: ShowcaseFrame) {
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
				{/* The time left of a run with no act stands a word space after the sentence's last word, on its line on touch, and never over it: a sentence that fills a phone's line, and one that wraps. */}
				<Banner
					tone="running"
					sentence="Waiting for the new device"
					until={new Date(Date.now() + 10 * MINUTE - 1000)}
				/>
				<Banner
					tone="running"
					sentence="Waiting for the new device to open the address and finish signing in"
					until={new Date(Date.now() + 10 * MINUTE - 1000)}
				/>
				<Pressed>
					<Banner
						tone="attention"
						sentence="Commits Stead did not land touched src/shelf."
						act={{ label: "Refresh", onAct: hang }}
					/>
					<Banner
						tone="failed"
						sentence="The last deploy of api failed."
						act={{ label: "Retry", onAct: hang }}
					/>
				</Pressed>
			</Wide>
		);
	if (frame.state === "disabled")
		return (
			<Wide>
				<Banner tone="attention" sentence={TRIAL} act={BLOCKED} />
				<TouchedContext value={TOUCHED}>
					<Banner tone="attention" sentence={TRIAL} act={BLOCKED} />
				</TouchedContext>
				<Banner
					tone="attention"
					sentence="Commits Stead did not land touched src/shelf."
					act={REFRESHING}
				/>
				<Banner
					tone="failed"
					sentence="The last deploy of api failed."
					act={{ ...REFRESHING, label: "Retry" }}
				/>
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
			{/* A sentence of two lines at a phone's width with an act that ends its last line, and one whose act starts a line of its own at the sentence's inset. */}
			<Banner
				tone="attention"
				sentence="Jobs and watches paused for usage · resumes 15:11."
				act={{ label: "Open Usage", onAct: act }}
			/>
			<Banner
				tone="attention"
				sentence="Usage is over the plan until the month ends."
				act={{ label: "Open Usage and Billing", onAct: act }}
			/>
			<Banner sentence="Deploys are paused while the region is under maintenance." />
			<Banner
				tone="attention"
				sentence="Usage is at 92 % of the plan's build minutes; builds queue once it reaches the limit on Oct 31."
				act={{ label: "Upgrade", onAct: act }}
			/>
			<Banner tone="failed" sentence={REFUSED} act={UPGRADE} />
		</Wide>
	);
}

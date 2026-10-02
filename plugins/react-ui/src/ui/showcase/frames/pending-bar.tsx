import { PendingBar } from "../../components/pending-bar/index.tsx";
import { TouchedContext } from "../../lib/touched.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const act = () => {};
// A touched form, so a blocked act shows its reason.
const TOUCHED = { touched: true, touch: act };
const CANCEL = { label: "Cancel", onAct: act };
const BLOCKED = {
	...CANCEL,
	blocked: "The build has finished; the deploy can no longer stop.",
};
const MINUTE = 60_000;

// Every cell draws the board's bars: no deadline, a deadline, no act and a
// long sentence at rest; `disabled` the blocked act before it is pressed and
// in a touched form with its reason shown.
export function drawPendingBar(frame: ShowcaseFrame) {
	if (frame.state === "disabled")
		return (
			<Wide>
				<PendingBar sentence="Deploying api from main" act={BLOCKED} />
				<TouchedContext value={TOUCHED}>
					<PendingBar sentence="Deploying api from main" act={BLOCKED} />
				</TouchedContext>
			</Wide>
		);
	const until = new Date(Date.now() + MINUTE);
	return (
		<Wide>
			<PendingBar sentence="Saving changes" act={CANCEL} />
			<PendingBar
				sentence="Restoring the backup of Sep 30"
				until={until}
				act={CANCEL}
			/>
			<PendingBar sentence="Checking the DNS records" />
			<PendingBar
				sentence="Copying 14,280 rows and 36 tables from acme-staging into acme-prod, then rebuilding the indexes"
				until={new Date(Date.now() + 2 * MINUTE)}
				act={CANCEL}
			/>
		</Wide>
	);
}

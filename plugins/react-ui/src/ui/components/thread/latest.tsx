import { cn } from "@fcalell/ui-core/cn";
import { THREAD_LATEST } from "@fcalell/ui-core/variants";
import { use } from "react";
import { ToLatest } from "../../lib/frame.ts";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";

// The layer covers the region over the docked foot, so the act centres on it
// and the log under it keeps the pointer everywhere else.
const LAYER =
	"absolute inset-0 flex flex-col items-center justify-end pointer-events-none";
const HIT = "flex pointer-events-auto";

/** The act back to the newest message, centred at the foot of the region it stands in while `ToLatest` holds the way back. */
export function Latest() {
	const back = use(ToLatest);
	const words = useWords();
	const touch = useTouch();
	if (!back) return null;
	return (
		<div className={LAYER}>
			<span className={cn(THREAD_LATEST, HIT)}>
				<Button
					act="secondary"
					fit={touch ? "body" : "bar"}
					icon="ArrowDown"
					label={words.latest}
					onAct={back}
				/>
			</span>
		</div>
	);
}

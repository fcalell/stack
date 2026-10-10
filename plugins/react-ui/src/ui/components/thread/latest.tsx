import { cn } from "@fcalell/ui-core/cn";
import { THREAD_LATEST } from "@fcalell/ui-core/variants";
import { useLayoutEffect, useRef, useState } from "react";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";

// The layer covers the region over the docked foot, so the act centres on it
// and the log under it keeps the pointer everywhere else.
const LAYER =
	"absolute inset-0 flex flex-col items-center justify-end pointer-events-none";
const HIT = "flex pointer-events-auto";
// Out of view the act keeps its place but leaves the tab order and the tree.
const OUT = "invisible";

/** The act back to the newest message, centred at the foot of the region it stands in while `onBack` holds the way back (`null` at the end). */
export function Latest({ onBack }: { onBack: (() => void) | null }) {
	const words = useWords();
	const touch = useTouch();
	const layer = useRef<HTMLDivElement>(null);
	const hit = useRef<HTMLSpanElement>(null);
	const [fits, setFits] = useState(true);
	const away = onBack !== null;
	// The act is reachable only while its whole box (and the focus ring around
	// it, which the act's own inset holds below) stands inside the region the
	// log shows: a region shorter than the act and its inset clips it.
	useLayoutEffect(() => {
		const outer = layer.current;
		const inner = hit.current;
		if (!away || !outer || !inner) return;
		const measure = () => {
			const style = getComputedStyle(outer);
			const ring =
				(Number.parseFloat(style.getPropertyValue("--focus-ring")) || 0) +
				(Number.parseFloat(style.getPropertyValue("--focus-ring-offset")) || 0);
			setFits(
				inner.getBoundingClientRect().top - ring >=
					outer.getBoundingClientRect().top,
			);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(outer);
		observer.observe(inner);
		return () => observer.disconnect();
	}, [away]);
	if (!onBack) return null;
	return (
		<div ref={layer} className={LAYER}>
			<span ref={hit} className={cn(THREAD_LATEST, HIT, !fits && OUT)}>
				<Button
					act="secondary"
					fit={touch ? "body" : "bar"}
					icon="ArrowDown"
					label={words.latest}
					onAct={onBack}
				/>
			</span>
		</div>
	);
}

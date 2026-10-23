import { cn } from "@fcalell/ui-core/cn";
import { STREAM_LATEST, THREAD_LATEST } from "@fcalell/ui-core/variants";
import { useEffect, useRef, useState } from "react";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";

// The layer covers the region over the docked foot, so the act centres on it
// and the log under it keeps the pointer everywhere else. It is the size
// container the act's reach is decided by: absolute, so its height is the
// region's whatever the content, and its font size is that reach (the act's
// height, a pair above the foot, and the focus ring around it), so the query
// below reads it as `1em`.
const LAYER =
	"absolute inset-0 flex flex-col items-center justify-end pointer-events-none [container-type:size] [font-size:calc(var(--spacing-control)+var(--spacing-gap)+var(--focus-ring)+var(--focus-ring-offset))] touch:[font-size:calc(var(--spacing-control)+var(--spacing-gap)+var(--focus-ring)+var(--focus-ring-offset))]";
// The act is reachable only while its whole box (and the focus ring around
// it) stands inside the region the log shows: a region shorter than that
// clips it, so it keeps its place but leaves the tab order and the tree.
const HIT = "flex pointer-events-auto [@container_(height_<_1em)]:invisible";

/** The act back to the newest message, centred at the foot of the region it stands in while the reader is away from the end (`shown`). It fades in rising on `fast` and leaves the same way back, staying mounted, `inert`, until it has gone. */
export function Latest(props: { shown: boolean; onBack: () => void }) {
	const { shown, onBack } = props;
	const words = useWords();
	const [mounted, setMounted] = useState(shown);
	if (shown && !mounted) setMounted(true);
	const box = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (shown || !mounted) return;
		let live = true;
		const going = (box.current?.getAnimations() ?? []).map(
			(one) => one.finished,
		);
		Promise.all(going).then(
			() => live && setMounted(false),
			() => live && setMounted(false),
		);
		return () => {
			live = false;
		};
	}, [shown, mounted]);
	if (!mounted) return null;
	return (
		<div className={LAYER}>
			<span
				ref={box}
				data-leaving={shown ? undefined : ""}
				inert={!shown}
				className={cn("flex", STREAM_LATEST)}
			>
				<span className={cn(THREAD_LATEST, HIT)}>
					<Button
						act="secondary"
						icon="ArrowDown"
						label={words.latest}
						onAct={onBack}
					/>
				</span>
			</span>
		</div>
	);
}

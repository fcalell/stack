import type { JSX } from "solid-js";
import { onCleanup, onMount } from "solid-js";

type ScrollAreaProps = {
	children?: JSX.Element;
	axis?: "y" | "x" | "both";
	pinToBottom?: boolean;
	class?: never;
	style?: never;
	classList?: never;
};

// The pane still counts as pinned within this many pixels of the bottom, so a
// reader who nudged the pane keeps following new content.
const PIN_THRESHOLD = 40;

// `y` and `both` are the fill pane of a flex box; `x` is an intrinsic-height
// strip, so a strip inside a column never becomes a second flexing region.
const AXIS = {
	y: "flex-1 min-h-0 min-w-0 overflow-y-auto",
	x: "w-full min-w-0 overflow-x-auto",
	both: "flex-1 min-h-0 min-w-0 overflow-auto",
};

// The one scroll owner for a pane. Sizing comes from the flex parent, never
// from a prop.
function ScrollArea(props: ScrollAreaProps) {
	let pane!: HTMLDivElement;
	onMount(() => {
		if (!props.pinToBottom) return;
		const pin = () => {
			pane.scrollTop = pane.scrollHeight;
		};
		// Pinned-ness is derived in the observer from the height as it was
		// before the change: scroll events dispatch with the rendering steps,
		// so a listener-kept flag loses the race against an append (always in a
		// throttled background tab) and snaps a reader back to the bottom.
		let lastScrollHeight = pane.scrollHeight;
		const observer = new MutationObserver(() => {
			const wasPinned =
				pane.scrollTop + pane.clientHeight >= lastScrollHeight - PIN_THRESHOLD;
			lastScrollHeight = pane.scrollHeight;
			if (wasPinned) pin();
		});
		observer.observe(pane, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
		});
		// A pane opened onto existing history starts at its end.
		pin();
		lastScrollHeight = pane.scrollHeight;
		onCleanup(() => observer.disconnect());
	});
	return (
		<div ref={pane} class={AXIS[props.axis ?? "y"]}>
			{props.children}
		</div>
	);
}

export type { ScrollAreaProps };
export { ScrollArea };

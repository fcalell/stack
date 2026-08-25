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
		// The observer callback fires after a change and cannot measure where
		// the pane was, so the scroll listener records pinned-ness ahead of it.
		let pinned = true;
		const onScroll = () => {
			pinned =
				pane.scrollHeight - pane.scrollTop - pane.clientHeight <= PIN_THRESHOLD;
		};
		const observer = new MutationObserver(() => {
			if (pinned) pin();
		});
		pane.addEventListener("scroll", onScroll);
		observer.observe(pane, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
		});
		// A pane opened onto existing history starts at its end.
		pin();
		onCleanup(() => {
			pane.removeEventListener("scroll", onScroll);
			observer.disconnect();
		});
	});
	return (
		<div ref={pane} class={AXIS[props.axis ?? "y"]}>
			{props.children}
		</div>
	);
}

export type { ScrollAreaProps };
export { ScrollArea };

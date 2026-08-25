import type { JSX } from "solid-js";

type FrameProps = {
	children?: JSX.Element;
	class?: never;
	style?: never;
	classList?: never;
};

// The viewport-capped app frame: the page never scrolls, panes inside it do.
// `dvh`, not `svh`: the frame clips, and `dvh` tracks the visible viewport as
// mobile browser chrome expands and collapses, so pinned bottom chrome stays
// reachable. No ground classes: the body owns the ground.
function Frame(props: FrameProps) {
	return (
		<div class="flex h-dvh min-h-0 flex-col overflow-hidden">
			{props.children}
		</div>
	);
}

export type { FrameProps };
export { Frame };

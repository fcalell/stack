import { createContext, onCleanup, onMount, useContext } from "solid-js";

// What the `Shell` hears from what it frames. A `Screen` covers the shell
// on the phone, where it is fixed over the column: the tab bar under it goes
// inert and the toasts follow it to the viewport's bottom. A pinned bar lifts
// the toasts by its height, so a toast never sits over the acts.
export type Frame = {
	cover: () => () => void;
	lift: (px: number) => void;
};

export const FrameContext = createContext<Frame>();

// A `Screen` covers the frame while it is mounted.
export function useCover(): void {
	const frame = useContext(FrameContext);
	onMount(() => {
		const release = frame?.cover();
		onCleanup(() => release?.());
	});
}

// A pinned bar lifts the toasts by its own height while it is mounted.
export function useLift(element: () => HTMLElement | undefined): void {
	const frame = useContext(FrameContext);
	onMount(() => {
		const target = element();
		if (!frame || !target) return;
		const observer = new ResizeObserver(() => frame.lift(target.offsetHeight));
		observer.observe(target);
		onCleanup(() => {
			observer.disconnect();
			frame.lift(0);
		});
	});
}

import { createEffect, createSignal, onCleanup, Show } from "solid-js";

export function NavigationProgress(props: { loading: boolean }) {
	const [visible, setVisible] = createSignal(false);
	const [width, setWidth] = createSignal(0);
	const [fading, setFading] = createSignal(false);

	createEffect(() => {
		let trickleTimer: ReturnType<typeof setInterval> | undefined;
		let hideTimer: ReturnType<typeof setTimeout> | undefined;

		if (props.loading) {
			setFading(false);
			setVisible(true);
			setWidth(15);

			trickleTimer = setInterval(() => {
				setWidth((w) => {
					if (w >= 90) return w;
					const remaining = 90 - w;
					return w + remaining * 0.08;
				});
			}, 200);
		} else if (visible()) {
			setWidth(100);
			setFading(true);

			hideTimer = setTimeout(() => {
				setVisible(false);
				setFading(false);
				setWidth(0);
			}, 300);
		}

		onCleanup(() => {
			clearInterval(trickleTimer);
			clearTimeout(hideTimer);
		});
	});

	return (
		<Show when={visible()}>
			<div
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(width())}
				class="h-0.5 w-full overflow-hidden"
				classList={{ "opacity-0 transition-opacity duration-300": fading() }}
			>
				<div
					class="h-full bg-primary transition-[width] duration-200 ease-out"
					style={{ width: `${width()}%` }}
				/>
			</div>
		</Show>
	);
}

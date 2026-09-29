import { For } from "solid-js";
import { dismissToast, toastPlacement, toasts } from "#lib/toast.ts";
import { Toast } from "../components/toast/index.tsx";

// The toast queue, drawn once at the app's root over every page, centred in
// the box its placement names and above the viewport's bottom by at least
// the home indicator. A toast's act dismisses it before it runs.
export function Toasts() {
	return (
		<div
			class="pointer-events-none fixed z-50 flex flex-col items-center gap-row"
			style={{
				left: `${toastPlacement().left}px`,
				right: `${toastPlacement().right}px`,
				bottom: `calc(var(--spacing-inset) + max(env(safe-area-inset-bottom), ${toastPlacement().bottom}px))`,
			}}
		>
			<For each={toasts()}>
				{(entry) => (
					<div class="pointer-events-auto">
						<Toast
							sentence={entry.sentence}
							state={entry.state}
							act={
								entry.act
									? {
											...entry.act,
											onAct: () => {
												dismissToast(entry.id);
												entry.act?.onAct();
											},
										}
									: undefined
							}
						/>
					</div>
				)}
			</For>
		</div>
	);
}

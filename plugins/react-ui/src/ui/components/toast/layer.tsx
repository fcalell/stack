import { Toast as Control } from "@base-ui/react/toast";
import { type ToastData, ToastEntry } from "../../lib/toast.ts";

// The stack's anchor at the layer's corner, a toast wide: each toast stands
// on its foot, raised by Base UI's offset.
const ANCHOR = "relative w-toast max-w-full";

import { Toast } from "./index.tsx";

/** The queued toasts, oldest first, each drawn as a `Toast`. Outside the package's exports: the toasts' layer (the Shell's) stands them inside Base UI's viewport. */
export function ToastList() {
	const { toasts } = Control.useToastManager<ToastData>();
	return (
		<div className={ANCHOR}>
			{toasts.toReversed().map((entry) => (
				<ToastEntry key={entry.id} value={entry}>
					<Toast
						sentence={entry.data?.sentence ?? ""}
						state={entry.data?.state}
						act={entry.data?.act}
					/>
				</ToastEntry>
			))}
		</div>
	);
}

import { dismissToast, ToastEntry, useToasts } from "../../lib/toast";
import { Toast } from "./index";

// The queued toasts, oldest first, each drawn as a `Toast` with its
// dismissal. Outside the package's exports: the toasts' layer (the Shell's)
// stands them.
export function ToastList() {
	return useToasts().map((entry) => (
		<ToastEntry.Provider key={entry.id} value={() => dismissToast(entry.id)}>
			<Toast sentence={entry.sentence} state={entry.state} act={entry.act} />
		</ToastEntry.Provider>
	));
}

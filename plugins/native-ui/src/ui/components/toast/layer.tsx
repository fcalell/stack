import { memo } from "react";
import { ToastEntry, useToasts } from "../../lib/toast";
import { Toast } from "./index";

// A queued toast, which renders again only when its own entry changes: a
// second toast raised leaves the first as it is.
const Queued = memo(function Queued({ entry }: { entry: ToastEntry }) {
	return (
		<ToastEntry.Provider value={entry.id}>
			<Toast sentence={entry.sentence} state={entry.state} act={entry.act} />
		</ToastEntry.Provider>
	);
});

// The queued toasts, oldest first. Outside the package's exports: the
// toasts' layer (the Shell's) stands them.
export function ToastList() {
	return useToasts().map((entry) => <Queued key={entry.id} entry={entry} />);
}

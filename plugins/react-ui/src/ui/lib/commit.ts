import { commitMoment } from "@fcalell/ui-core/commit";
import { type KeyboardEvent, useState } from "react";

// The focus, blur and key handlers that drive a typing control's commit
// moments (`@fcalell/ui-core/commit`): leaving the field commits, Enter
// commits a one-line field (`enter`), and Escape puts back the value at focus
// and leaves the field when the control has an `onCommit`.
export function useCommit(
	value: string,
	onChange: (value: string) => void,
	onCommit: ((value: string) => void) | undefined,
	enter: boolean,
) {
	const [moment] = useState(() => commitMoment<string>());
	const commit = (next: string) => onCommit?.(next);
	return {
		onFocus: () => moment.focus(value),
		onBlur: () => moment.leave(value, commit),
		onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
			if (enter && event.key === "Enter") moment.commit(value, commit);
			if (onCommit && event.key === "Escape") {
				moment.cancel(value, onChange);
				event.currentTarget.blur();
			}
		},
	};
}

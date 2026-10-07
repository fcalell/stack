// Whether leaving a form asks, and the one question per leave. A `Form` holds
// one `Leave`: a field's input edits it, the filled act's press hands the
// edit to the act, and a leave attempt (a router navigation on the web, a
// back or a navigate on the phone) asks the viewer while the form stands
// edited. Both plugins' `Form` and `ActionBar` drive it, so the web and the
// phone ask under the same rules.
export interface Leave {
	// A field took input.
	edit(): void;
	// The filled act was pressed: the form no longer stands edited and holds no question while the act runs, so an act that navigates (at once or once its promise resolves) is never asked.
	press(): void;
	// The filled act ended, resolved or `rejected` (an act that throws or whose promise rejects): a rejection puts back the edit the press took, since the form was not saved.
	settle(rejected: boolean): void;
	// Whether a leave now would ask: edited and no act running. The browser's `beforeunload` and the phone's `beforeRemove` read it.
	asks(): boolean;
	// One leave: `true` where it may go ahead, with no question while the form asks nothing or while another question is open, the leave then held. `ask` resolves `true` to discard the edit and `false` to keep editing; a discard clears the edit, so the leave it lets through is not asked again.
	attempt(ask: () => Promise<boolean>): Promise<boolean>;
}

export function createLeave(): Leave {
	let edited = false;
	let pending = false;
	// The edit a press took, back if the act is rejected.
	let held = false;
	let asking = false;
	const asks = () => edited && !pending;
	return {
		edit() {
			edited = true;
		},
		press() {
			held = edited;
			edited = false;
			pending = true;
		},
		settle(rejected) {
			pending = false;
			if (rejected && held) edited = true;
			held = false;
		},
		asks,
		async attempt(ask) {
			if (!asks()) return true;
			if (asking) return false;
			asking = true;
			try {
				const discard = await ask();
				if (discard) edited = false;
				return discard;
			} finally {
				asking = false;
			}
		},
	};
}

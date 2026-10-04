// When a typing control's value is final: the viewer leaves the field, or
// presses Enter on a one-line field, having changed the value since the
// field took focus. Escape puts back the value the field had then and ends
// the edit. Both platforms' `Input` and `TextArea` drive one of these per
// field, so an autosaving form commits the same moments on the web and on
// native.
export interface CommitMoment<V> {
	// The field took focus holding `value`.
	focus(value: V): void;
	// Enter: `onCommit` hears `value` when it moved since focus, and it is
	// the value the next commit compares against.
	commit(value: V, onCommit: (value: V) => void): void;
	// The field lost focus: a commit, then the edit is over.
	leave(value: V, onCommit: (value: V) => void): void;
	// Escape: `restore` hears the value at focus, or at the last commit, when
	// the field moved since, and the edit is over: a leave after it commits
	// nothing, whatever value it reads before the parent renders the restored
	// one. The control leaves the field.
	cancel(value: V, restore: (value: V) => void): void;
}

export function commitMoment<V>(): CommitMoment<V> {
	let atFocus: { value: V } | undefined;
	const commit = (value: V, onCommit: (value: V) => void) => {
		if (!atFocus || Object.is(atFocus.value, value)) return;
		atFocus = { value };
		onCommit(value);
	};
	return {
		focus(value) {
			atFocus = { value };
		},
		commit,
		leave(value, onCommit) {
			commit(value, onCommit);
			atFocus = undefined;
		},
		cancel(value, restore) {
			const at = atFocus;
			atFocus = undefined;
			if (at && !Object.is(at.value, value)) restore(at.value);
		},
	};
}

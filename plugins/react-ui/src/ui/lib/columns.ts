import type { TableColumn } from "@fcalell/ui-core/descriptors";
import {
	type ColumnChoice,
	columnsKey,
	parseColumnChoice,
	visibleColumns,
} from "@fcalell/ui-core/list-state";
import { createStore } from "@fcalell/ui-core/store";
import { useCallback, useMemo, useSyncExternalStore } from "react";

// The viewer's columns are theirs from one visit to the next: a convenience,
// so a store that is blocked or empty leaves the choice for the visit alone.
// What was read or written stands here, the one source every table of the
// page reads.
const held = createStore(new Map<string, string | null>());

function read(key: string): string | null {
	const saved = held.get();
	if (!saved.has(key)) {
		try {
			saved.set(key, localStorage.getItem(key));
		} catch {
			saved.set(key, null);
		}
	}
	return saved.get(key) ?? null;
}

function write(key: string, value: string): void {
	held.get().set(key, value);
	try {
		localStorage.setItem(key, value);
	} catch {}
	held.emit();
}

/** The columns a table stands with: what its consumer declared (`hidden`) under what the viewer chose, which `toggle` changes, `reset` clears and the browser keeps (the table's `label` names the choice, else its columns' keys do). Outside the package's exports. */
export function useColumns<C extends TableColumn>(
	columns: readonly C[],
	label: string | undefined,
): {
	shown: readonly C[];
	choice: ColumnChoice;
	toggle: (key: string, on: boolean) => void;
	reset: () => void;
} {
	const key = columnsKey(columns, label);
	const raw = useSyncExternalStore(
		held.subscribe,
		() => read(key),
		() => null,
	);
	const choice = useMemo(() => parseColumnChoice(raw), [raw]);
	const shown = useMemo(
		() => visibleColumns(columns, choice),
		[columns, choice],
	);
	const toggle = useCallback(
		(column: string, on: boolean) =>
			write(key, JSON.stringify({ ...choice, [column]: on })),
		[key, choice],
	);
	const reset = useCallback(() => write(key, "{}"), [key]);
	return { shown, choice, toggle, reset };
}

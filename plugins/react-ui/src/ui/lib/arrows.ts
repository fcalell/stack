import type { KeyboardEvent } from "react";

// A touch sheet's rows (a menu's items, a pick's options) are buttons the
// arrow keys, Home and End move through, the way a popover's rows move under
// Base UI: `role` names the rows inside the element that hears the keys.
export function arrowsOver(role: string) {
	return (event: KeyboardEvent<HTMLElement>): void => {
		const rows = [
			...event.currentTarget.querySelectorAll<HTMLElement>(`[role="${role}"]`),
		];
		const at = rows.indexOf(document.activeElement as HTMLElement);
		const next =
			event.key === "ArrowDown"
				? (at + 1) % rows.length
				: event.key === "ArrowUp"
					? (at - 1 + rows.length) % rows.length
					: event.key === "Home"
						? 0
						: event.key === "End"
							? rows.length - 1
							: undefined;
		if (next === undefined) return;
		event.preventDefault();
		rows[next]?.focus();
	};
}

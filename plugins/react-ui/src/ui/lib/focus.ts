import { type RefObject, useEffect, useRef } from "react";

// What a viewer's Tab reaches in a region: anything rendered whose effective
// tab index is 0 or more, so a button, a field, a roving radio group's one tab
// stop and a scroller that took a stop all count, in document order.
export function isTabbable(element: HTMLElement): boolean {
	return (
		element.tabIndex >= 0 &&
		!("disabled" in element && element.disabled) &&
		element.closest('[hidden], [inert], [aria-hidden="true"]') === null &&
		element.checkVisibility()
	);
}

// Focuses the first tabbable element in `root`; `only` narrows it to those
// matching a selector (a foot hands focus to its typing control, not to the
// attach act ahead of it).
export function focusFirst(root: HTMLElement | null, only?: string): boolean {
	const all = root?.querySelectorAll<HTMLElement>("*") ?? [];
	const first = Array.from(all).find(
		(element) => isTabbable(element) && (!only || element.matches(only)),
	);
	first?.focus();
	return first !== undefined;
}

// Whether focus is inside a region, as the page last moved it. A focus or a
// press landing outside the region ends the hold; one inside begins it. The
// removal of the focused element fires neither, so the hold survives it: that
// is how a region learns its focus left with its own page.
export function trackHold(
	doc: Pick<Document, "addEventListener" | "removeEventListener">,
	region: () => HTMLElement | null,
	hold: { current: boolean },
): () => void {
	const follow = (event: Event) => {
		hold.current = region()?.contains(event.target as Node | null) ?? false;
	};
	doc.addEventListener("focusin", follow, true);
	doc.addEventListener("pointerdown", follow, true);
	return () => {
		doc.removeEventListener("focusin", follow, true);
		doc.removeEventListener("pointerdown", follow, true);
	};
}

// A foot region hands focus to its first field when what held it leaves with
// its own page (a docked `Sheet` closing for the `MessageInput` that returns):
// the document takes focus then. Who held focus is tracked by the page's own
// focus and press events, never read from the DOM during a render: the React
// compiler memoizes a render-time ref read, so the answer would be the mount's.
export function useFootFocus(region: RefObject<HTMLElement | null>) {
	const held = useRef(false);
	useEffect(() => trackHold(document, () => region.current, held), [region]);
	useEffect(() => {
		if (held.current && document.activeElement === document.body) {
			held.current = false;
			focusFirst(region.current, "input, textarea");
		}
	});
}

// The element an act in a popup (a `Picker`'s or a `Menu`'s) opens a sheet
// from, which the popup's close unmounts the act's own row from: the popup's
// trigger, held for the one sheet that opens in the same breath.
const OPENER_WINDOW = 1000;
let opener: { element: HTMLElement | null; at: number } | undefined;

// The trigger of the popup that is open: a pick's or a menu's trigger, or a
// touch sheet's, which carry `aria-expanded` while it stands.
export function expandedTrigger(
	doc: Pick<Document, "querySelectorAll">,
): HTMLElement | null {
	const all = doc.querySelectorAll<HTMLElement>(
		'[aria-expanded="true"]:is([aria-haspopup], [role="combobox"])',
	);
	return all.item(all.length - 1);
}

// An act in a popup calls this before it closes the popup and runs.
export function rememberOpener(element: HTMLElement | null, now = Date.now()) {
	opener = { element, at: now };
}

// The sheet that opens takes the remembered trigger once, if the act that
// named it ran a moment ago.
export function claimOpener(now = Date.now()): HTMLElement | null {
	const held = opener;
	opener = undefined;
	return held && now - held.at <= OPENER_WINDOW ? held.element : null;
}

// Focus on the page a sheet left standing: its head's, or its first control,
// retried while a route is still drawing the page.
export function focusPage(tries = 5): void {
	for (const page of document.querySelectorAll<HTMLElement>("[data-page]"))
		if (focusFirst(page)) return;
	if (tries > 0) setTimeout(() => focusPage(tries - 1), 100);
}

// A sheet that closes with its focus inside it and nowhere to fall back to
// (its opener unmounted with the popup that held the act, or no act opened it,
// a route did) hands focus to its opener when that stands, else to the page's
// head. Focus is read as `useFootFocus` reads it: from the page's own focus
// and press events, so a press on the scrim, which moved focus on purpose, is
// left alone.
export function useReturnFocus(
	open: boolean,
	region: RefObject<HTMLElement | null>,
) {
	const held = useRef(false);
	const turn = useRef(0);
	useEffect(() => trackHold(document, () => region.current, held), [region]);
	useEffect(() => {
		if (!open) return;
		const mine = ++turn.current;
		const active = document.activeElement;
		held.current = region.current?.contains(active) ?? false;
		const from =
			claimOpener() ??
			(active instanceof HTMLElement &&
			active !== document.body &&
			!region.current?.contains(active)
				? active
				: null);
		// Acts once the sheet is gone: its leave played, or its route unmounted it.
		let frames = 0;
		const settle = () => {
			if (turn.current !== mine) return;
			if (region.current && frames++ < 120) {
				requestAnimationFrame(settle);
				return;
			}
			if (!held.current || document.activeElement !== document.body) return;
			held.current = false;
			if (from?.isConnected && isTabbable(from)) from.focus();
			else focusPage();
		};
		return () => {
			setTimeout(settle, 0);
		};
	}, [open, region]);
}

// Opening a record from the list hands the keyboard to the record: its head's
// first control, so the Tab after a row's open is not the list's next row. The
// list's own opening presses (a row's hit, a tree row's Enter) begin it; Tab
// and the arrows through the list, unopened, are left alone. The record may
// still be loading, so it waits for the record to draw, up to `SEEK`.
const SEEK = 2000;
export function useRecordFocus(
	list: HTMLElement | null,
	main: HTMLElement | null,
) {
	const record = useRef<HTMLElement | null>(null);
	useEffect(() => {
		record.current = main;
	}, [main]);
	useEffect(() => {
		const root = list?.parentElement;
		if (!list || !root) return;
		let stop: (() => void) | undefined;
		const seek = () => {
			stop?.();
			const watch = new MutationObserver(() => attempt());
			let timer = 0;
			let frame = 0;
			const end = () => {
				watch.disconnect();
				clearTimeout(timer);
				cancelAnimationFrame(frame);
				stop = undefined;
			};
			// Done once focus stands somewhere that is neither the list nor the
			// body, or the record took it.
			const attempt = () => {
				const active = document.activeElement;
				if (active !== document.body && !list.contains(active)) return end();
				if (record.current && focusFirst(record.current)) end();
			};
			stop = end;
			watch.observe(root, { childList: true, subtree: true });
			timer = window.setTimeout(end, SEEK);
			frame = requestAnimationFrame(attempt);
		};
		const press = (event: Event) => {
			if ((event.target as Element | null)?.closest("[data-hit]")) seek();
		};
		const enter = (event: KeyboardEvent) => {
			const row = (event.target as Element | null)?.closest(
				'[role="treeitem"]',
			);
			if (event.key === "Enter" && row) seek();
		};
		list.addEventListener("click", press, true);
		list.addEventListener("keydown", enter, true);
		return () => {
			list.removeEventListener("click", press, true);
			list.removeEventListener("keydown", enter, true);
			stop?.();
		};
	}, [list]);
}

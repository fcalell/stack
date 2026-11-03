import type { Dragged, Drop, Moved } from "@fcalell/ui-core/descriptors";
import {
	accepts,
	DRAG_HOLD,
	DROP_HOLD,
	edgeSpeed,
	moveOf,
	pressed,
	sideOf,
} from "@fcalell/ui-core/drag";
import { counted, type Words } from "@fcalell/ui-core/tokens";
import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";
import { type Act, useAct } from "./act.ts";

// Drag and drop on pointer events, which keep going when the dragged row
// leaves the window of a long collection (a native drag's source unmounts
// with its row), reach a finger, and carry the scroller under the pointer. One
// drag stands at a time, held here, outside React: the rows and the drops
// that take part read it through `useSyncExternalStore`.

/** What a press on a row hands the store, once it becomes a drag. */
export interface Source {
	/** What is dragged to a drop; none for a row that is only reordered. */
	drag?: Dragged;
	/** What the label that follows the pointer reads: the row's name, or the count dragged. */
	label: string;
	/** The row is dragged within its collection too. */
	reorder?: Reordering;
}

/** A collection's order, as a drag within it reads and moves it. */
export interface Reordering {
	/** The row dragged. */
	id: string;
	/** The collection's box: only rows inside it are places to land. */
	root: () => HTMLElement | null;
	/** The ids in the order they stand now (undefined where a window has not loaded a row). */
	ids: () => readonly (string | undefined)[];
	move: (id: string, to: Moved) => void;
}

/** Where the line that marks the landing is, in the viewport. */
export interface Line {
	left: number;
	top: number;
	width: number;
}

/** What a drag in progress looks like, for the layer that draws it. */
export interface View {
	label: string;
	x: number;
	y: number;
	over: string | undefined;
	line: Line | undefined;
}

interface Live {
	source: Source;
	/** The folded branch the pointer has stood over, and since when (ms). */
	holding: string | undefined;
	since: number;
	x: number;
	y: number;
	over: string | undefined;
	moved: Moved | undefined;
	line: Line | undefined;
}

/** A drop as the store takes it: the data it declares, and how to run a drop on it with its wiring. */
interface Target {
	id: string;
	drop: () => Drop | undefined;
	run: (drag: Dragged) => void;
	/** The place's path, which names it where labels clash; none for a row. */
	path: string;
	/** The route the target leads to (a place's route, a row's `href`), which says two registrations are one target. */
	route: string | undefined;
}

/** A drop that is only offered by menu: a place's, whether or not its row stands. */
interface Listing {
	drop: () => Drop | undefined;
	path: string;
	route: string | undefined;
}

/** A branch a drag opens by holding over it. */
export interface Hold {
	wants: (kind: string) => boolean;
	open: () => void;
}

const targets = new Map<string, Target>();
const listed = new Map<string, Listing>();
const holds = new Map<string, Hold>();
const listeners = new Set<() => void>();
let view: View | undefined;
// Counts every change to the drops standing, so what lists them draws again.
let version = 0;

function notify() {
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function show(next: View | undefined) {
	view = next;
	notify();
}

function same(a: View | undefined, b: View | undefined): boolean {
	if (!a || !b) return a === b;
	return (
		a.x === b.x &&
		a.y === b.y &&
		a.over === b.over &&
		a.label === b.label &&
		a.line?.top === b.line?.top &&
		a.line?.left === b.line?.left &&
		a.line?.width === b.line?.width
	);
}

/** The drag in progress, for the layer that draws its label and its line. */
export function useDrag(): View | undefined {
	return useSyncExternalStore(
		subscribe,
		() => view,
		() => undefined,
	);
}

/** Whether an element is a scroller with room to scroll. */
function scrolls(element: Element): boolean {
	return (
		element.scrollHeight > element.clientHeight &&
		/auto|scroll/.test(getComputedStyle(element).overflowY)
	);
}

/** Opens the folded branch a drag of a kind a drop under it accepts has stood over for `DROP_HOLD`. */
function hold(live: Live, found: Element[]) {
	const kind = live.source.drag?.kind;
	let holding: string | undefined;
	if (kind !== undefined) {
		for (const element of found) {
			const id = element.closest<HTMLElement>("[data-hold]")?.dataset.hold;
			if (id !== undefined && holds.get(id)?.wants(kind)) {
				holding = id;
				break;
			}
		}
	}
	const now = performance.now();
	if (holding !== live.holding) {
		live.holding = holding;
		live.since = now;
	} else if (holding !== undefined && now - live.since >= DROP_HOLD) {
		holds.get(holding)?.open();
		live.since = now;
	}
}

/** The press that follows a drag on the element that started it is not a click: the first click after the release is swallowed. */
function swallowClick() {
	const stop = (event: Event) => {
		event.stopPropagation();
		event.preventDefault();
	};
	window.addEventListener("click", stop, { capture: true, once: true });
	setTimeout(() => window.removeEventListener("click", stop, true), 0);
}

// A press that lands on a control of its own is that control's; the row's hit
// is the one control a press on the row lands on.
const OWN =
	"button:not([data-hit]), input, textarea, select, [contenteditable], [role=menuitem], [role=checkbox], [role=slider], [data-nodrag]";

// Whether a press stands (a drag stands only after one).
let pressing = false;

/** Starts a press on a row. Past the slop (a finger: after its hold) it becomes a drag, which `make` describes lazily, since the rows are read when the drag begins. Escape and a cancelled pointer end it with no drop. */
export function press(
	event: ReactPointerEvent<Element>,
	make: () => Source | undefined,
): void {
	if (pressing) return;
	if (event.button !== 0 || !event.isPrimary) return;
	if ((event.target as Element).closest(OWN)) return;
	const pointer = event.pointerType;
	const start = { x: event.clientX, y: event.clientY };
	const at = { ...start };
	let held = pointer !== "touch";
	let live: Live | undefined;
	let frame = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// A held finger's long press would open the browser's menu on a link.
	const stop = (event: Event) => event.preventDefault();
	const touchmove = (event: Event) => {
		if (live && event.cancelable) event.preventDefault();
	};

	const probe = (found: Element[]) => {
		if (!live) return;
		const { source } = live;
		let over: string | undefined;
		for (const element of found) {
			const mark = element.closest<HTMLElement>("[data-drop]");
			const target = mark && targets.get(mark.dataset.drop ?? "");
			const drop = target?.drop();
			if (
				target &&
				drop &&
				drop.blocked === undefined &&
				accepts(drop.accepts, source.drag?.kind)
			) {
				over = target.id;
				break;
			}
		}
		let moved: Moved | undefined;
		let line: Line | undefined;
		const order = source.reorder;
		const root = order?.root();
		if (order && root && over === undefined) {
			for (const element of found) {
				const mark = element.closest<HTMLElement>("[data-row]");
				if (!mark || !root.contains(mark)) continue;
				const row = (mark.closest("tr") ?? mark) as HTMLElement;
				const box = row.getBoundingClientRect();
				const side = sideOf(live.y, box.top, box.height);
				moved = moveOf(order.ids(), order.id, mark.dataset.row ?? "", side);
				if (moved) {
					line = {
						left: box.left,
						width: box.width,
						top: side === "before" ? box.top : box.bottom,
					};
				}
				break;
			}
		}
		live.over = over;
		live.moved = moved;
		live.line = line;
	};

	const tick = () => {
		frame = requestAnimationFrame(tick);
		if (!live) return;
		const found = document.elementsFromPoint(live.x, live.y);
		// The scroller under the pointer is carried near its edges, whichever
		// list holds it; a branch held over opens.
		const scroller = found.find(scrolls);
		if (scroller) {
			const box = scroller.getBoundingClientRect();
			scroller.scrollTop += edgeSpeed(live.y, box.top, box.bottom);
		}
		hold(live, found);
		probe(found);
		const next: View = {
			label: live.source.label,
			x: live.x,
			y: live.y,
			over: live.over,
			line: live.line,
		};
		if (!same(view, next)) show(next);
	};

	const begin = () => {
		const source = make();
		if (!source) return cleanup(false);
		live = {
			source,
			holding: undefined,
			since: 0,
			x: at.x,
			y: at.y,
			over: undefined,
			moved: undefined,
			line: undefined,
		};
		window.getSelection()?.removeAllRanges();
		window.addEventListener("selectstart", stop);
		window.addEventListener("touchmove", touchmove, { passive: false });
		frame = requestAnimationFrame(tick);
	};

	const move = (next: PointerEvent) => {
		at.x = next.clientX;
		at.y = next.clientY;
		if (live) {
			live.x = at.x;
			live.y = at.y;
			return;
		}
		const verdict = pressed(
			pointer,
			Math.hypot(at.x - start.x, at.y - start.y),
			held,
		);
		if (verdict === "cancel") cleanup(false);
		else if (verdict === "drag") begin();
	};

	const up = () => cleanup(true);
	const cancel = () => cleanup(false);
	const key = (event: KeyboardEvent) => {
		if (event.key === "Escape") cleanup(false);
	};

	function cleanup(commit: boolean) {
		clearTimeout(timer);
		cancelAnimationFrame(frame);
		window.removeEventListener("pointermove", move);
		window.removeEventListener("pointerup", up);
		window.removeEventListener("pointercancel", cancel);
		window.removeEventListener("keydown", key, true);
		window.removeEventListener("contextmenu", stop);
		window.removeEventListener("selectstart", stop);
		window.removeEventListener("touchmove", touchmove);
		pressing = false;
		const done = live;
		live = undefined;
		if (!done) return;
		show(undefined);
		swallowClick();
		if (!commit) return;
		const { over, moved, source } = done;
		if (over !== undefined && source.drag) targets.get(over)?.run(source.drag);
		else if (moved && source.reorder) {
			source.reorder.move(source.reorder.id, moved);
		}
	}

	pressing = true;
	window.addEventListener("pointermove", move);
	window.addEventListener("pointerup", up);
	window.addEventListener("pointercancel", cancel);
	window.addEventListener("keydown", key, true);
	window.addEventListener("contextmenu", stop);
	if (pointer === "touch") {
		timer = setTimeout(() => {
			held = true;
			begin();
		}, DRAG_HOLD);
	}
}

/** What the label that follows the pointer reads: the row's name, or how many rows the pick holds (the counted `dragged` word). */
export function draggedLabel(
	words: Words,
	name: string,
	count: number,
): string {
	return count <= 1 ? name : counted(words.dragged, count);
}

// The key of what a drop shows of itself to the rows that offer it by menu.
function keyOf(drop: Drop | undefined): string {
	if (!drop) return "";
	const kinds =
		typeof drop.accepts === "string" ? drop.accepts : drop.accepts.join(",");
	return `${drop.label}|${drop.blocked ?? ""}|${kinds}`;
}

/** A place that takes a drag (`drop`, data): its `data-drop` mark, which the drag finds it by, and whether a drag it accepts is over it now. Released on, it runs `onDrop` as an act does: its `confirm` asked, its `done` toasted, its `to` gone to, a rejection toasted. `route` is where the place or row leads (a place's route, a row's `href`) and `path` names a place among those that share a label (a menu entry names each by it). */
export function useDrop(
	drop: Drop | undefined,
	route?: string,
	path = "",
): {
	mark: { "data-drop": string } | Record<string, never>;
	over: boolean;
} {
	const id = useId();
	const acting = useAct<true>("toast");
	const latest = useRef({ drop, acting });
	latest.current = { drop, acting };
	const has = drop !== undefined;
	useEffect(() => {
		if (!has) return undefined;
		targets.set(id, {
			id,
			path,
			route,
			drop: () => latest.current.drop,
			run: (dragged) => {
				const now = latest.current.drop;
				if (!now) return;
				latest.current.acting.run(true, {
					label: now.label,
					onAct: () => now.onDrop(dragged),
					confirm: now.confirm,
					done: now.done,
					to: now.to,
				});
			},
		});
		version++;
		notify();
		return () => {
			targets.delete(id);
			version++;
			notify();
		};
	}, [id, has, path, route]);
	const shows = keyOf(drop);
	const first = useRef(true);
	// What the drop says of itself changed: the rows that offer it by menu draw again.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `shows` is the change
	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		version++;
		notify();
	}, [shows]);
	const over = useSyncExternalStore(
		subscribe,
		() => view?.over === id,
		() => false,
	);
	return { mark: has ? { "data-drop": id } : {}, over };
}

/** The drops of a set of places, offered by menu whether or not the place stands (a folded branch's children, a place a window has not drawn): the owner of the places' specs lists them, each with its `path`. */
export function useListedDrops(
	items: readonly { drop: Drop; path: string; route: string }[],
): void {
	const id = useId();
	const latest = useRef(items);
	latest.current = items;
	const shows = items
		.map((each) => `${each.path}|${keyOf(each.drop)}`)
		.join("\n");
	// biome-ignore lint/correctness/useExhaustiveDependencies: `shows` is the change
	useEffect(() => {
		const keys = latest.current.map((each, at) => {
			const key = `${id}:${at}`;
			listed.set(key, {
				path: each.path,
				route: each.route,
				drop: () => latest.current[at]?.drop,
			});
			return key;
		});
		version++;
		notify();
		return () => {
			for (const key of keys) listed.delete(key);
			version++;
			notify();
		};
	}, [id, shows]);
}

/** A folded branch a drag opens by a hold: the `data-hold` mark the drag finds it by. While a drag of a kind `wants` accepts stands over the branch for a moment, `open` runs. Given none, the branch is no hold. */
export function useHold(hold: Hold | undefined): {
	"data-hold"?: string;
} {
	const id = useId();
	const latest = useRef(hold);
	latest.current = hold;
	const has = hold !== undefined;
	useEffect(() => {
		if (!has) return undefined;
		holds.set(id, {
			wants: (kind) => latest.current?.wants(kind) === true,
			open: () => latest.current?.open(),
		});
		return () => {
			holds.delete(id);
		};
	}, [id, has]);
	return has ? { "data-hold": id } : {};
}

/** The acts that do by menu what a drag of `kind` does by pointer: one for each drop standing that accepts it, running the drop with what `payload` reads when the act is pressed. Nothing is merged by label. Places that share a label are each named by their path (`Add to Warm-up (Sets › Warm-up)`). A row and a place are one target only where the row's `href` is the place's route, and then one entry; every other row stands under its label, beside a place of that label too, and a row with no `href` always stands. Appended to the row's own more menu, so a drag is never the only way. */
export function useOffers(
	kind: string | undefined,
	payload: () => Dragged,
): readonly Act[] {
	const stood = useSyncExternalStore(
		subscribe,
		() => version,
		() => 0,
	);
	const read = useRef(payload);
	read.current = payload;
	// biome-ignore lint/correctness/useExhaustiveDependencies: `stood` is the drops standing
	return useMemo(() => {
		if (kind === undefined) return [];
		// Every drop standing that takes the kind: a place's with its path, a row's
		// with where it leads.
		const entries: { drop: Drop; path: string; route: string | undefined }[] =
			[];
		for (const each of [...targets.values(), ...listed.values()]) {
			const drop = each.drop();
			if (drop && accepts(drop.accepts, kind)) {
				entries.push({ drop, path: each.path, route: each.route });
			}
		}
		const places = entries.filter((each) => each.path);
		const stands = (label: string) =>
			places.filter((each) => each.drop.label === label);
		const acts: Act[] = [];
		const seen = new Set<string>();
		for (const each of entries) {
			const { drop, path, route } = each;
			// A row and a place are one target where both lead to one route; a row
			// with no route is its own. Every other drop stands.
			const same = path
				? places.find(
						(one) => one.path === path && one.drop.label === drop.label,
					) !== each
				: route !== undefined &&
					places.some(
						(one) => one.route === route && one.drop.label === drop.label,
					);
			const key = `${drop.label}\0${path || route || ""}`;
			if (same || ((path || route) && seen.has(key))) continue;
			seen.add(key);
			// Places that share a label are named by their paths.
			const clash =
				path && new Set(stands(drop.label).map((one) => one.path)).size > 1;
			acts.push({
				label: clash ? `${drop.label} (${path})` : drop.label,
				blocked: drop.blocked,
				confirm: drop.confirm,
				done: drop.done,
				to: drop.to,
				onAct: () => drop.onDrop(read.current()),
			});
		}
		return acts;
	}, [kind, stood]);
}

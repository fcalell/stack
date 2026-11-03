import type { Dragged, Drop, Moved } from "@fcalell/ui-core/descriptors";
import {
	accepts,
	DRAG_HOLD,
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
// with its row), reach a finger, and let a collection carry its scroller. One
// drag stands at a time, held here, outside React: the rows and the drops
// that take part read it through `useSyncExternalStore`.

/** What a press on a row hands the store, once it becomes a drag. */
export interface Source {
	/** What is dragged to a drop; none for a row that is only reordered. */
	drag?: Dragged;
	/** What the label that follows the pointer reads: the row's name, or the count dragged. */
	label: string;
	/** The nearest scroller of the collection, carried near its edges. */
	scroller?: () => HTMLElement | null;
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
}

const targets = new Map<string, Target>();
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

	const probe = () => {
		if (!live) return;
		const { source } = live;
		const found = document.elementsFromPoint(live.x, live.y);
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
		const scroller = live.source.scroller?.();
		if (scroller) {
			const box = scroller.getBoundingClientRect();
			if (live.x >= box.left && live.x <= box.right) {
				const speed = edgeSpeed(live.y, box.top, box.bottom);
				if (speed !== 0) scroller.scrollTop += speed;
			}
		}
		probe();
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

/** A place that takes a drag (`drop`, data): its `data-drop` mark, which the drag finds it by, and whether a drag it accepts is over it now. Released on, it runs `onDrop` as an act does: its `confirm` asked, its `done` toasted, its `to` gone to, a rejection toasted. */
export function useDrop(drop: Drop | undefined): {
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
	}, [id, has]);
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

/** The acts that do by menu what a drag of `kind` does by pointer: one for each drop standing that accepts it (drops of one `label` are one entry), running the drop with what `payload` reads when the act is pressed. Appended to the row's own more menu, so a drag is never the only way. */
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
		const acts: Act[] = [];
		// A drop standing twice (a place and a row for one playlist) is one entry.
		const labels = new Set<string>();
		for (const target of targets.values()) {
			const drop = target.drop();
			if (!drop || !accepts(drop.accepts, kind)) continue;
			if (labels.has(drop.label)) continue;
			labels.add(drop.label);
			acts.push({
				label: drop.label,
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

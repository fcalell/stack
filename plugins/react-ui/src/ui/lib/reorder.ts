import { isThenable } from "@fcalell/plugin-api/acts";
import type { Moved, Reorder } from "@fcalell/ui-core/descriptors";
import { moveEntry, type Step, stepOf } from "@fcalell/ui-core/drag";
import type { Words } from "@fcalell/ui-core/tokens";
import {
	type RefObject,
	use,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { type Act, useAct } from "./act.ts";
import { Scroller } from "./window.tsx";

/** A collection's order, as its rows read and move it: handed to each row, one object for the collection's life. */
export interface Movable {
	/** The collection's box, which the rows stand in. */
	root: () => HTMLElement | null;
	/** The ids in the order they stand now. */
	ids: () => readonly (string | undefined)[];
	/** The nearest scroller. */
	scroller: () => HTMLElement | null;
	/** Moves a row: it stands there at once, and `onMove` hears it. */
	move: (id: string, to: Moved) => void;
}

interface Held {
	source: unknown;
	moves: readonly { id: string; index: number }[];
}

const NONE: Held["moves"] = [];

/** A collection that orders its rows (`reorder`): its `rows` in the order the viewer has moved them to, and the `Movable` its rows read and move it by. A move shows at once and stands until the data answers another (`source`, the data the rows are read from, changes) or the move is refused; `onMove` runs as an act does, its `done` toasted, a rejection toasted with Retry. Off (`on` false: a sorted table, a tree), the rows are as given and there is nothing to move. */
export function useMovable<T>(args: {
	reorder: Reorder | undefined;
	on: boolean;
	source: unknown;
	rows: readonly T[];
	idOf: (row: T) => string | undefined;
	box: RefObject<HTMLElement | null>;
}): { rows: readonly T[]; movable: Movable | undefined } {
	const { reorder, source, idOf } = args;
	const scroll = use(Scroller);
	const acting = useAct<true>("toast");
	const [held, hold] = useState<Held>();
	const moves = held && held.source === source ? held.moves : NONE;
	const on = args.on && reorder !== undefined;
	const rows = useMemo(() => {
		if (!on || moves.length === 0) return args.rows;
		return moves.reduce<readonly T[]>((order, move) => {
			const from = order.findIndex((row) => idOf(row) === move.id);
			return from < 0 ? order : moveEntry(order, from, move.index);
		}, args.rows);
	}, [on, moves, args.rows, idOf]);
	const latest = useRef({ reorder, acting, rows, source, idOf, scroll });
	latest.current = { reorder, acting, rows, source, idOf, scroll };
	const move = useCallback((id: string, to: Moved) => {
		const now = latest.current;
		const spec = now.reorder;
		if (!spec) return;
		hold((was) => ({
			source: now.source,
			moves: [
				...(was && was.source === now.source ? was.moves : NONE),
				{ id, index: to.index },
			],
		}));
		now.acting.run(true, {
			done: spec.done,
			onAct: () => {
				const undo = () => hold(undefined);
				try {
					const result = spec.onMove(id, to);
					if (!isThenable(result)) return result;
					return Promise.resolve(result).catch((error: unknown) => {
						undo();
						throw error;
					});
				} catch (error) {
					undo();
					throw error;
				}
			},
		});
	}, []);
	const movable = useMemo<Movable>(
		() => ({
			root: () => args.box.current,
			ids: () => latest.current.rows.map((row) => latest.current.idOf(row)),
			scroller: () => latest.current.scroll?.holder.current ?? null,
			move,
		}),
		[args.box, move],
	);
	return { rows, movable: on ? movable : undefined };
}

/** Where a row stands in an order that moves, for the moves its menu offers: the first row cannot go up, the last cannot go down. */
export type Edge = "first" | "last" | "only";

/** The edge of the row at `index` of `count`. */
export function edgeOf(index: number, count: number): Edge | undefined {
	if (count <= 1) return "only";
	if (index === 0) return "first";
	return index === count - 1 ? "last" : undefined;
}

const STEPS: readonly {
	step: Step;
	word: "moveUp" | "moveDown" | "moveFirst" | "moveLast";
	icon: "ArrowUp" | "ArrowDown" | "ChevronsUp" | "ChevronsDown";
	from: Edge | "none";
}[] = [
	{ step: "up", word: "moveUp", icon: "ArrowUp", from: "first" },
	{ step: "down", word: "moveDown", icon: "ArrowDown", from: "last" },
	{ step: "first", word: "moveFirst", icon: "ChevronsUp", from: "first" },
	{ step: "last", word: "moveLast", icon: "ChevronsDown", from: "last" },
];

/** The entries that move a row by menu, so an order is never the pointer's alone: up, down, to the top and to the bottom, each left out where the row already stands. They read the order when pressed. */
export function movesOf(
	words: Words,
	movable: Movable,
	id: string,
	edge: Edge | undefined,
): Act[] {
	return STEPS.filter((one) => edge !== "only" && edge !== one.from).map(
		(one) => ({
			label: words[one.word],
			icon: one.icon,
			onAct: () => {
				const to = stepOf(movable.ids(), id, one.step);
				if (to) movable.move(id, to);
			},
		}),
	);
}

/** The step a key makes of the row it is pressed on: Alt with Up, Down, Home or End. */
export function stepKey(event: {
	key: string;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
}): Step | undefined {
	if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
		return undefined;
	}
	switch (event.key) {
		case "ArrowUp":
			return "up";
		case "ArrowDown":
			return "down";
		case "Home":
			return "first";
		case "End":
			return "last";
		default:
			return undefined;
	}
}

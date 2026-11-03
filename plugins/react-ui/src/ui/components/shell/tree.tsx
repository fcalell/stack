import { cn } from "@fcalell/ui-core/cn";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { treeMove, treeRows, treeStop } from "@fcalell/ui-core/list-state";
import { placesFolded } from "@fcalell/ui-core/route";
import {
	DROP_ON,
	PLACE_NEST,
	placeRow,
	placeRowGlyph,
	text,
} from "@fcalell/ui-core/variants";
import {
	type CSSProperties,
	type KeyboardEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { useDrop } from "../../lib/drag.ts";
import { useFolds } from "../../lib/folds.ts";
import { follow, isRoute } from "../../lib/navigate.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Icon } from "../icon/index.tsx";
import {
	GLYPH,
	LABEL,
	PLACE_COUNT,
	ROW_BOX,
	ROW_PRESS,
	ROW_SELECTED_PRESS,
} from "./row.ts";

const TREE = "flex flex-col";
// The anchor is the row's hit: glyph, label and count, the fold act beside it.
const HIT = "flex items-center gap-gap grow min-w-0";

const childrenOf = (spec: PlaceSpec) => spec.children;
const keyOf = (spec: PlaceSpec) => spec.route;

/** A run of places that nest, as the WAI-ARIA tree: one tab stop on the current place's row (else the first), Up and Down between the visible rows, Right to open a branch and to step into it, Left to fold it and to step out to its parent, Home and End, Enter to open the place. A branch is open by the viewer's choice (kept by the browser), else when the current place is under it. */
export function PlaceTree(props: {
	specs: readonly PlaceSpec[];
	label: string;
	route: string | undefined;
	trail: readonly string[];
	onPlace?: () => void;
}) {
	const { specs, label, route, trail, onPlace } = props;
	const { chosen, choose } = useFolds();
	const folded = useMemo(
		() => placesFolded(specs, chosen, trail),
		[specs, chosen, trail],
	);
	const rows = useMemo(
		() => treeRows(specs, { key: keyOf, children: childrenOf }, folded),
		[specs, folded],
	);
	// The key of the row holding the one tab stop: the last focused, else the
	// current place's.
	const [active, setActive] = useState<string>();
	const stop = treeStop(rows, active ?? route);
	const box = useRef<HTMLDivElement>(null);
	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		// A key's target is the focused element, an HTML one here.
		const target = event.target as HTMLElement;
		if (target.getAttribute("role") !== "treeitem") return;
		// Space does nothing on a row (WAI-ARIA): it is no page scroll either.
		if (event.key === " ") {
			event.preventDefault();
			return;
		}
		if (event.key === "Enter") {
			event.preventDefault();
			// The anchor does what a press on the row does.
			target.querySelector("a")?.click();
			return;
		}
		const at = rows.findIndex((each) => each.key === target.dataset.key);
		const move = treeMove(rows, at, event.key);
		if (!move) return;
		event.preventDefault();
		if ("focus" in move) {
			// Every visible row is mounted, in the rows' order.
			box.current
				?.querySelectorAll<HTMLElement>('[role="treeitem"]')
				[move.focus]?.focus();
		} else choose(move.fold, move.open);
	};
	return (
		<div
			ref={box}
			role="tree"
			aria-label={label}
			onKeyDown={onKeyDown}
			onFocus={(event) => {
				const key = (event.target as HTMLElement).closest<HTMLElement>(
					'[role="treeitem"]',
				)?.dataset.key;
				if (key !== undefined) setActive(key);
			}}
			className={TREE}
		>
			{rows.map((each, index) => (
				<TreeRow
					key={each.key}
					spec={each.item}
					depth={each.depth}
					size={each.size}
					place={each.place}
					branch={each.branch}
					open={each.open}
					tabbable={index === stop}
					current={each.key === route}
					onPath={trail.includes(each.key)}
					onToggle={() => choose(each.key, !each.open)}
					onPlace={onPlace}
				/>
			))}
		</div>
	);
}

// One place of the tree: its row (a `treeitem` that takes the drop and the
// keys), the anchor that goes to the place, and a branch's fold act at the end.
function TreeRow(props: {
	spec: PlaceSpec;
	depth: number;
	size: number;
	place: number;
	branch: boolean;
	open: boolean;
	tabbable: boolean;
	current: boolean;
	onPath: boolean;
	onToggle: () => void;
	onPlace?: () => void;
}) {
	const { spec, branch, open, current, onPath, onToggle, onPlace } = props;
	const words = useWords();
	const { mark, over } = useDrop(spec.drop);
	const state = current ? "selected" : "rest";
	// The place the current one is under keeps the ink of a selected one.
	const ink = current || onPath ? "selected" : "rest";
	// A branch that is no page (a spot, `#folder`) only opens and folds.
	const folder = branch && !isRoute(spec.route);
	return (
		<div
			role="treeitem"
			tabIndex={props.tabbable ? 0 : -1}
			aria-level={props.depth + 1}
			aria-setsize={props.size}
			aria-posinset={props.place}
			aria-expanded={branch ? open : undefined}
			aria-current={current ? "page" : onPath ? "true" : undefined}
			data-key={spec.route}
			{...mark}
			style={{ "--level": props.depth } as CSSProperties}
			className={cn(
				placeRow({ state }),
				ROW_BOX,
				current ? ROW_SELECTED_PRESS : ROW_PRESS,
				over && DROP_ON,
			)}
		>
			{props.depth > 0 ? (
				<span aria-hidden="true" className={PLACE_NEST} />
			) : null}
			<a
				href={spec.route}
				tabIndex={-1}
				onClick={(event) => {
					if (folder) {
						event.preventDefault();
						onToggle();
						return;
					}
					follow(event);
					onPlace?.();
				}}
				className={HIT}
			>
				<span className={cn(placeRowGlyph({ state: ink }), GLYPH)}>
					<Icon name={spec.icon} />
				</span>
				<span
					className={cn(
						text({ role: "body" }),
						placeRowGlyph({ state: ink }),
						LABEL,
					)}
				>
					{spec.label}
				</span>
				{spec.count === undefined ? null : (
					<span className={cn(text({ role: "caption" }), PLACE_COUNT)}>
						{spec.count}
					</span>
				)}
			</a>
			{branch ? (
				<IconButtonBase
					icon="ChevronDown"
					open={open}
					label={`${open ? words.collapse : words.expand} ${spec.label}`}
					tabIndex={-1}
					onClick={onToggle}
				/>
			) : null}
		</div>
	);
}

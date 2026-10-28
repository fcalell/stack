import { cn } from "@fcalell/ui-core/cn";
import type { CanvasNode, CanvasPoint } from "@fcalell/ui-core/descriptors";
import { named } from "@fcalell/ui-core/tokens";
import {
	BLOCK_IN,
	CANVAS_PORT,
	CANVAS_PORT_HIT,
	canvasNode,
	canvasNodeGlyph,
	canvasNodeInk,
	canvasNodeName,
	canvasNodeText,
	LINE_IN,
	lineBox,
	PATH_TONE,
	STATUS,
	STATUS_LABEL,
} from "@fcalell/ui-core/variants";
import {
	type FocusEvent,
	type MouseEvent,
	type PointerEvent,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { PARTS_ITEMS, PartsLine } from "../../lib/parts-line.tsx";
import { useWords } from "../../lib/words.tsx";
import { IconButtonLink } from "../button/glyph.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { StatusDot } from "../status/dot.tsx";
import { UNZOOM } from "./floor.ts";
import type { Size } from "./geometry.ts";
import { hit } from "./hit.ts";
import { useLift } from "./lift.ts";
import type { NodeLook } from "./look.ts";
import { ZOOM_TO_NODE } from "./view.ts";
import type { About, Viewport } from "./viewport.ts";

// The node's icon draws in the node's own ink (`canvasNodeInk`): it would else
// take the ink the page resolved before the mode scope it stands in.
const BOX = "absolute flex items-center text-start select-none";
// A call node's card leaves its end to the open act, which stands over it: the
// act's size, the inset from the edge and a pair of air.
const OPENABLE =
	"pe-[calc(var(--spacing-control)+var(--spacing-gap)+var(--spacing-gap))]";
// The open act stands over the card's own box, which takes no pointer but for
// the act itself.
const OPEN_BOX =
	"absolute flex items-center justify-end pe-gap pointer-events-none";
const OPEN_ACT = "pointer-events-auto";
// A decision's diamond, behind the node's icon in a box of the glyph's size.
const MARK_BOX =
	"relative isolate flex shrink-0 items-center justify-center size-control";
// A node held by a long press draws the selection's colour at the focus ring's
// width; its lift (`LIFT`, in the node's cell) is marked by `data-lifted`.
const HELD = "outline-2 outline-selected-outline";
const HOVERED = "hover:border-edge-hover";
const FOCUSED = "focus-visible:outline-2 focus-visible:outline-ring";
const GRAB = "cursor-grab active:cursor-grabbing";
// The card of a node that has not landed: it keeps its box, so the layout does
// not move, and draws nothing until it lands. The card whose glyph stands in
// its place keeps its box too, and fades out on the answer's `fast` (`FADED`)
// as the glyph fades in; it is inert and hidden from a reader meanwhile, since
// the glyph is the node.
const INVISIBLE = "invisible";
const FADED = "opacity-0 pointer-events-none";
// A dragged node stands over the others where they overlap, in the layer's own
// stacking context, with no shadow: the hairline and the ground say it is held.
const LIFTED = "z-1";
// The in port a dragged link would end on fills with ink. A pointer capture
// holds :hover on the out port, so the canvas hit-tests and says which.
const TARGET = "bg-edge-strong";
const PORT_IN = "cursor-default";
const PORT_OUT = "cursor-crosshair";
// A node's status is a mark, and a mark leads the meta line under the name
// (voice 9): the status's dot and word start the node's line, the line's own
// words a middle dot after them, so the title takes the node's whole width.
// The word keeps its whole width up to the short measure and truncates only
// past it; the line stands beside it where it fits whole and wraps whole to a
// line of its own under the word where it does not, the dot hanging in its
// lane before both (`PartsLine`), and wraps to a second line, cut at that
// one's end, so a list of callers or answers keeps more than its first words;
// the node measures its height, so a two-line node lays out at it.
const COLUMN = "flex flex-col flex-auto min-w-0";
const LINE = "truncate";
const LINE_TWO = "line-clamp-2 break-words";
const MARKED = "flex items-start min-w-0";
const LANE = "flex shrink-0 items-center h-[1lh]";
const MARKS = "items-center min-w-0";
const WORD = "min-w-0 max-w-measure-short truncate";
const LINE_PART = "line-clamp-2 break-words";
// The trailing column holds what is no mark of the line: the figure, and the
// problem's danger dot.
const TRAILING = "flex flex-col items-end shrink-0 text-meta leading-meta";
// A port's hit stands centred on the node's border edge (a pixel outside the
// padding box it is placed in), where a route starts or ends: a line of no
// height along the edge centres the hit across it and takes no pointer.
const EDGE = "absolute inset-x-0 h-0 flex items-center justify-center";
const EDGE_TOP = "-top-px";
const EDGE_BOTTOM = "-bottom-px";
const HIT = "flex items-center justify-center shrink-0";
// The glyph form: a box over the card's own, taking no pointer itself, and the
// glyph button in it, which does. The marks are seated on the glyph's right
// corners, clear of its icon: the status above, the problem below.
const GLYPH_BOX =
	"absolute flex items-center justify-center pointer-events-none";
const GLYPH =
	"relative flex items-center justify-center size-control pointer-events-auto select-none";
// The overview's name, at the glyph's inline end and centred on it. It stands a
// `pair` out, clear of the marks that straddle the glyph's corners, and scales
// with the glyph, so it keeps the floor size on screen at any zoom.
const NAME = "absolute start-full top-1/2 -translate-y-1/2 ms-gap";
// An absolute mark is placed from the glyph's padding box, inside its border, so
// each offset takes the border's pixel back; the dot's centre stands on the
// card's rounded corner (where its arc meets the diagonal, `1 - 1/√2` of the
// card radius in from the box's corner), half of it over the glyph, so it reads
// as the glyph's and never floats past the curve.
const MARK =
	"absolute flex -right-[calc(var(--spacing-dot)/2-var(--radius-card)*0.29)] -mr-px";
const MARK_TOP =
	"-top-[calc(var(--spacing-dot)/2-var(--radius-card)*0.29)] -mt-px";
const MARK_BOTTOM =
	"-bottom-[calc(var(--spacing-dot)/2-var(--radius-card)*0.29)] -mb-px";

// Reports the element's layout size: the border box, which the layer's scale
// does not change. The callback only records it, so it cannot loop.
function useSize(
	id: string,
	report: (id: string, size: Size) => void,
): [HTMLElement | null, (element: HTMLElement | null) => void] {
	const [element, setElement] = useState<HTMLElement | null>(null);
	useLayoutEffect(() => {
		if (!element) return;
		const watch = new ResizeObserver(([entry]) => {
			const box = entry?.borderBoxSize[0];
			if (box) report(id, { width: box.inlineSize, height: box.blockSize });
		});
		watch.observe(element);
		return () => watch.disconnect();
	}, [element, id, report]);
	return [element, setElement];
}

const client = (event: PointerEvent): CanvasPoint => ({
	x: event.clientX,
	y: event.clientY,
});

// Where a node stands, and how large once it is measured.
interface Placed {
	x: number;
	y: number;
	width?: number;
	height?: number;
}

const stop = (event: { stopPropagation(): void }) => event.stopPropagation();

const swallow = (event: MouseEvent) => {
	event.stopPropagation();
	event.preventDefault();
};

// What a node's pointer can do, and with which parts of the canvas it does it.
export interface NodeEdit {
	viewport: Viewport;
	region: RefObject<HTMLElement | null>;
	// The touch density: a finger lifts a node by a long press, and a node's
	// ports are drawn at the target size at any zoom.
	touch: boolean;
	// With `onMove` on a pointer, above the text floor, the node follows a drag.
	draggable: boolean;
	// With `onMove` in the touch density, above the text floor, a long press
	// lifts the node and a mouse still drags it at once.
	liftable: boolean;
	// With `onConnect`, the node shows an in and an out port.
	ports: boolean;
	// Sets a node's live position, `null` clearing it.
	at: (id: string, point: CanvasPoint | null) => void;
	// A release that moved the node: reports it, then clears the live position.
	drop: (id: string, point: CanvasPoint) => void;
	// Sets the connection in progress from a node, `null` clearing it.
	// `target` is the node whose in port the pointer is over.
	linking: (
		from: string,
		to: CanvasPoint | null,
		target: string | null,
	) => void;
	onConnect?: (from: string, to: string | null) => void;
	// Where a node stands at a scale, which a glyph's zoom holds it by.
	about: (id: string) => About;
}

// Whether the node has landed: it was measured but not yet placed, and now it
// is, so it fades in at its place. A node that came with its place never did.
function useLanded(landing: boolean): boolean {
	const [was, setWas] = useState(landing);
	if (landing && !was) setWas(true);
	return was && !landing;
}

// A node: its glyph, its text column and its trailing figure, placed in flow
// coordinates. With `onSelect` it is one button named by its visible text;
// without, the same box, drawn and not operated. Under the text floor (`below`)
// the card keeps its box and draws nothing, and a glyph button stands over it;
// until the canvas is `bare` the glyph carries its node's name.
// This is the one place a node's pointer handlers live.
export function NodeView({
	node,
	look,
	box,
	landing,
	lifted,
	targeted,
	below,
	bare,
	edit,
	onSelect,
	onSize,
	onFocusVisible,
}: {
	node: CanvasNode;
	look: NodeLook;
	box: Placed;
	// Measured but not yet placed: it draws nothing until it is.
	landing: boolean;
	// A drag holds it, so it stands over the nodes it crosses.
	lifted: boolean;
	// A link being drawn would end on its in port.
	targeted: boolean;
	// The canvas is under the text floor: the node is its glyph alone.
	below: boolean;
	// The canvas is under the overview's floor: the glyph carries no name.
	bare: boolean;
	edit: NodeEdit;
	onSelect?: (id: string | null) => void;
	onSize: (id: string, size: Size) => void;
	// A keyboard focus brings the node into view.
	onFocusVisible: (id: string) => void;
}) {
	const {
		viewport,
		region,
		touch,
		draggable,
		liftable,
		ports,
		at,
		drop,
		linking,
		onConnect,
		about,
	} = edit;
	const { id } = node;
	const [full, measure] = useSize(id, onSize);
	const arrived = useLanded(landing);
	const words = useWords();
	const lift = useLift({
		id,
		enabled: liftable,
		viewport,
		at,
		drop,
		place: () => ({ x: box.x, y: box.y }),
	});
	// A press on the node holds where it took the node; one on the out port, whether
	// the pointer has left it.
	const held = useRef<{
		grab: CanvasPoint;
		from: CanvasPoint;
		target: HTMLElement;
	} | null>(null);
	const linked = useRef<CanvasPoint | null>(null);
	const moved = useRef(false);
	// The click that ends a drag is armed to be swallowed until it arrives or a
	// task passes.
	const armed = useRef(false);
	// A glyph activated by a key hands its focus to the card that replaces it.
	const refocus = useRef(false);
	const figure = node.number ?? node.count;
	const lines = { line: node.line, off: words.off, problem: node.problem };
	const body = lines[look.shows];
	const status = look.status ? node.status : undefined;
	const part = (name: "overline" | "title" | "line", value: string) => (
		<span
			className={cn(
				canvasNodeText({ part: name, tone: look.tone }),
				name === "line" ? LINE_TWO : LINE,
			)}
		>
			{value}
		</span>
	);
	const { width, height } = box;
	const frame =
		width !== undefined && height !== undefined
			? { x: box.x, y: box.y, width, height }
			: null;
	const glyphed = below && frame !== null;
	const opens = look.role === "call" && node.href !== undefined;
	const classes = cn(
		canvasNode({ state: look.state, role: look.role, tone: look.surface }),
		canvasNodeInk({ tone: look.surface }),
		BOX,
		opens && OPENABLE,
		lift.lifted && HELD,
		onSelect && look.state === "rest" && HOVERED,
		onSelect && FOCUSED,
		draggable && GRAB,
		lifted && LIFTED,
		landing && INVISIBLE,
		glyphed && FADED,
		// A node that lands fades in at its place.
		arrived && !landing && BLOCK_IN,
	);
	// A node's place is a coordinate of the flow, known at run time.
	const place = { left: box.x, top: box.y };

	useEffect(() => {
		if (below || !refocus.current) return;
		refocus.current = false;
		full?.focus();
	}, [below, full]);

	// A mouse in the touch density drags at once, and the press marks the node
	// before d3-zoom's `mousedown` reads its filter; the mark goes with the press.
	const unpan = (element: HTMLElement) => {
		if (touch) element.removeAttribute("data-no-pan");
	};
	const press = (event: PointerEvent<HTMLElement>) => {
		if (event.button !== 0) return;
		if (touch) event.currentTarget.setAttribute("data-no-pan", "");
		event.currentTarget.setPointerCapture(event.pointerId);
		const point = viewport.screenToFlow(client(event));
		held.current = {
			grab: { x: point.x - box.x, y: point.y - box.y },
			from: client(event),
			target: event.currentTarget,
		};
		moved.current = false;
	};
	const where = (event: PointerEvent, grab: CanvasPoint): CanvasPoint => {
		const point = viewport.screenToFlow(client(event));
		return { x: point.x - grab.x, y: point.y - grab.y };
	};
	const drag = (event: PointerEvent<HTMLElement>) => {
		const state = held.current;
		if (!state) return;
		if (event.clientX !== state.from.x || event.clientY !== state.from.y)
			moved.current = true;
		if (moved.current) at(id, where(event, state.grab));
	};
	const release = (event: PointerEvent<HTMLElement>) => {
		const state = held.current;
		if (!state) return;
		held.current = null;
		unpan(state.target);
		event.currentTarget.releasePointerCapture(event.pointerId);
		if (!moved.current) return;
		drop(id, where(event, state.grab));
		armed.current = true;
		setTimeout(() => {
			armed.current = false;
		}, 0);
	};
	const cancel = () => {
		const state = held.current;
		if (!state) return;
		held.current = null;
		unpan(state.target);
		at(id, null);
	};
	// d3 does not suppress the click that ends a drag it rejected, so the node
	// does: neither it nor the region's ground click sees it.
	const guard = (event: MouseEvent) => {
		if (!armed.current) return;
		armed.current = false;
		swallow(event);
	};
	const handlers = (() => {
		if (draggable)
			return {
				"data-no-pan": "",
				onPointerDown: press,
				onPointerMove: drag,
				onPointerUp: release,
				onPointerCancel: cancel,
				onClickCapture: guard,
			};
		// A finger on a node pans like one on the ground until the node lifts, and
		// the lift is the one `data-no-pan` the filter reads at the next touch.
		if (touch)
			return {
				"data-no-pan": lift.lifted ? "" : undefined,
				onPointerDown: (event: PointerEvent<HTMLElement>) => {
					lift.bind.onPointerDown(event);
					if (liftable && event.pointerType === "mouse") press(event);
				},
				onPointerMove: (event: PointerEvent<HTMLElement>) => {
					drag(event);
					lift.bind.onPointerMove(event);
				},
				onPointerUp: (event: PointerEvent<HTMLElement>) => {
					release(event);
					lift.bind.onPointerUp(event);
				},
				onPointerCancel: (event: PointerEvent<HTMLElement>) => {
					cancel();
					lift.bind.onPointerCancel(event);
				},
				onClickCapture: (event: MouseEvent) => {
					guard(event);
					lift.bind.onClickCapture(event);
				},
				onContextMenu: lift.bind.onContextMenu,
			};
		return {};
	})();

	const link = {
		press(event: PointerEvent<HTMLElement>) {
			stop(event);
			if (event.button !== 0) return;
			event.currentTarget.setPointerCapture(event.pointerId);
			linked.current = client(event);
			moved.current = false;
		},
		move(event: PointerEvent<HTMLElement>) {
			const from = linked.current;
			if (!from) return;
			if (event.clientX !== from.x || event.clientY !== from.y)
				moved.current = true;
			const target = region.current;
			if (!moved.current || !target) return;
			linking(
				id,
				viewport.screenToFlow(client(event)),
				hit(client(event), target).node,
			);
		},
		release(event: PointerEvent<HTMLElement>) {
			if (!linked.current) return;
			linked.current = null;
			event.currentTarget.releasePointerCapture(event.pointerId);
			linking(id, null, null);
			const target = region.current;
			if (!moved.current || !target) return;
			const found = hit(client(event), target);
			if (found.node !== null) onConnect?.(id, found.node);
			else if (found.ground) onConnect?.(id, null);
		},
		cancel() {
			if (!linked.current) return;
			linked.current = null;
			linking(id, null, null);
		},
	};
	// On touch a port's hit stands at the target size at any zoom.
	const reach = touch ? UNZOOM : undefined;
	const connectors =
		ports && !glyphed ? (
			<>
				<span className={cn(EDGE, EDGE_TOP)}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: a port is a pointer shortcut; connecting by keyboard is the consumer's own sheet, so it takes no role and no key. */}
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: a port is a pointer shortcut; connecting by keyboard is the consumer's own sheet, so it takes no role and no key. */}
					<span
						data-port="in"
						data-node={id}
						data-no-pan
						onPointerDown={stop}
						onClick={swallow}
						style={reach}
						className={cn(CANVAS_PORT_HIT, HIT, PORT_IN)}
					>
						<span className={cn(CANVAS_PORT, "shrink-0", targeted && TARGET)} />
					</span>
				</span>
				<span className={cn(EDGE, EDGE_BOTTOM)}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: a port is a pointer shortcut; connecting by keyboard is the consumer's own sheet, so it takes no role and no key. */}
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: a port is a pointer shortcut; connecting by keyboard is the consumer's own sheet, so it takes no role and no key. */}
					<span
						data-port="out"
						data-node={id}
						data-no-pan
						onPointerDown={link.press}
						onPointerMove={link.move}
						onPointerUp={link.release}
						onPointerCancel={link.cancel}
						onClick={swallow}
						style={reach}
						className={cn(CANVAS_PORT_HIT, HIT, PORT_OUT)}
					>
						<span className={cn(CANVAS_PORT, "shrink-0")} />
					</span>
				</span>
			</>
		) : null;

	// A decision's icon stands in its diamond, which sits behind it.
	const icon =
		look.role === "decision" ? (
			<span className={MARK_BOX}>
				<span
					aria-hidden
					className={canvasNodeGlyph({
						state: look.state,
						role: "decision",
						tone: look.surface,
					})}
				/>
				<Icon name={node.icon} fit="meta" />
			</span>
		) : (
			<Icon name={node.icon} fit="meta" />
		);
	const line = (value: string) => (
		<span
			className={cn(
				canvasNodeText({ part: "line", tone: look.tone }),
				LINE_PART,
			)}
		>
			{value}
		</span>
	);
	// The line under the name: the status leading it from its dot's lane, or the
	// line alone.
	const meta = status ? (
		<span className={cn(STATUS, MARKED)}>
			<span className={cn(lineBox({ role: "meta" }), LANE)}>
				<StatusDot tone={status.tone} />
			</span>
			<span className={cn(PARTS_ITEMS, MARKS)}>
				<span className={cn(STATUS_LABEL, WORD)}>
					{status.label ?? words[status.tone]}
				</span>
				{body ? (
					<PartsLine
						parts={[line(body)]}
						form="items"
						led
						className={canvasNodeText({ part: "line", tone: look.tone })}
					/>
				) : null}
			</span>
		</span>
	) : body ? (
		part("line", body)
	) : null;
	const content = (
		<>
			{icon}
			<span className={COLUMN}>
				{node.overline ? part("overline", node.overline) : null}
				{part("title", node.title)}
				{meta}
			</span>
			{figure === undefined && !look.problem ? null : (
				<span className={TRAILING}>
					{figure === undefined ? null : <Count value={figure} />}
					{look.problem ? <StatusDot tone="failed" /> : null}
				</span>
			)}
			{connectors}
		</>
	);
	// A press focuses the button too, and panning then would move a node out from
	// under the pointer: only a keyboard focus pans.
	const focused = (event: FocusEvent<HTMLButtonElement>) => {
		if (event.currentTarget.matches(":focus-visible")) onFocusVisible(id);
	};
	const element = onSelect ? (
		<button
			type="button"
			ref={measure}
			data-focus={id}
			data-lifted={lift.lifted ? "" : undefined}
			inert={glyphed}
			aria-hidden={glyphed || undefined}
			style={place}
			onClick={() => onSelect(id)}
			onFocus={focused}
			className={classes}
			{...handlers}
		>
			{content}
		</button>
	) : (
		<div
			ref={measure}
			data-lifted={lift.lifted ? "" : undefined}
			inert={glyphed}
			aria-hidden={glyphed || undefined}
			style={place}
			className={classes}
			{...handlers}
		>
			{content}
		</div>
	);
	// A tap, a click and a key all zoom to the node at its own size about its
	// centre, which stays where it stands, and bring the full form back; they never select it. A key's click hands focus on to it.
	const glyph = glyphed ? (
		// The glyph box's place and size are coordinates of the flow, known at run time.
		<div
			className={cn(GLYPH_BOX, LINE_IN)}
			style={{
				left: frame.x,
				top: frame.y,
				width: frame.width,
				height: frame.height,
			}}
		>
			<button
				type="button"
				// The name the glyph carries alone, and whole where the overview cuts it: a native tooltip, which also names the button for axe and voice control.
				title={node.title}
				data-focus={id}
				onClick={(event) => {
					refocus.current = event.detail === 0;
					viewport.zoomTo(ZOOM_TO_NODE, about(id));
				}}
				onFocus={focused}
				onPointerDown={lift.bind.onPointerDown}
				onPointerMove={lift.bind.onPointerMove}
				onPointerUp={lift.bind.onPointerUp}
				onPointerCancel={lift.bind.onPointerCancel}
				onClickCapture={lift.bind.onClickCapture}
				style={UNZOOM}
				className={cn(
					GLYPH,
					PATH_TONE,
					canvasNodeInk({ tone: look.surface }),
					FOCUSED,
				)}
			>
				<span
					aria-hidden
					data-shape
					className={canvasNodeGlyph({
						state: look.state,
						role: look.role,
						tone: look.surface,
					})}
				/>
				<Icon name={node.icon} fit="body" />
				{bare ? null : (
					<span
						data-name
						className={cn(canvasNodeName({ tone: look.tone }), NAME)}
					>
						{node.title}
					</span>
				)}
				{look.status && node.status ? (
					<span className={cn(MARK, MARK_TOP)}>
						<StatusDot tone={node.status.tone} />
					</span>
				) : null}
				{look.problem ? (
					<span className={cn(MARK, MARK_BOTTOM)}>
						<StatusDot tone="failed" />
					</span>
				) : null}
			</button>
		</div>
	) : null;
	// The open act of a call node, over the card's own box at its end. It is the
	// card's sibling (an anchor cannot stand in a button), so it never selects
	// the node, and a drag from it pans no more than from the zoom stack.
	const open =
		opens && !glyphed && frame !== null && node.href !== undefined ? (
			<div
				data-no-pan
				className={OPEN_BOX}
				// The box's place and size are coordinates of the flow, known at run time.
				style={{
					left: frame.x,
					top: frame.y,
					width: frame.width,
					height: frame.height,
				}}
			>
				<span className={OPEN_ACT}>
					<IconButtonLink
						icon="ArrowUpRight"
						label={named(words.open, node.title)}
						href={node.href}
					/>
				</span>
			</div>
		) : null;
	return (
		<>
			{element}
			{open}
			{glyph}
		</>
	);
}

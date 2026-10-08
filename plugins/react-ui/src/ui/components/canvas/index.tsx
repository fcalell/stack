import { pathOrder } from "@fcalell/ui-core/canvas";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
	CanvasPath,
	CanvasPoint,
} from "@fcalell/ui-core/descriptors";
import {
	CANVAS_GROUND,
	CANVAS_GROUP,
	CANVAS_GROUP_HEAD,
} from "@fcalell/ui-core/variants";
import {
	type KeyboardEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useEffectEvent,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { useTouch } from "../../lib/media.ts";
import { ConnectionLine } from "./connection.tsx";
import { EdgeLayer } from "./edges.tsx";
import {
	belowFloor,
	glyphSize,
	minZoomFor,
	TEXT_FLOOR,
	UNZOOM_VAR,
} from "./floor.ts";
import type { Size } from "./geometry.ts";
import { GroupFrame } from "./group.tsx";
import { isGround } from "./hit.ts";
import { EdgeLabel } from "./label.tsx";
import { useLayout } from "./layout.ts";
import { type EdgeTone, edgeLook, nodeLook } from "./look.ts";
import { type NodeEdit, NodeView } from "./node.tsx";
import { landAt, place } from "./view.ts";
import { useViewport, useViewportValue } from "./viewport.ts";
import { ActFoot, ZoomStack } from "./zoom.tsx";

/** A graph of nodes and edges on a pannable, zoomable ground. */
export interface CanvasProps extends Closed {
	/** What the graph is, read as its region's name (a short phrase; read aloud, never drawn). */
	label: string;
	/** The nodes; the canvas places those that carry no position. */
	nodes: readonly CanvasNode[];
	/** The links between nodes, each drawn as an arrow from `from` to `to`. */
	edges?: readonly CanvasEdge[];
	/** Frames around the nodes they hold. */
	groups?: readonly CanvasGroup[];
	/** The selected node's id. */
	selected?: string;
	/** Hears a node's id when it is chosen, `null` when the choice is cleared; with it nodes are buttons. */
	onSelect?: (id: string | null) => void;
	/** A run's taken path; what it leaves out dims. */
	path?: CanvasPath;
	/** Hears each node's absolute position once the canvas places the nodes; with it nodes can be moved. */
	onMove?: (id: string, position: CanvasPoint) => void;
	/** Hears a drawn link, `to` being `null` when released on the ground; with it nodes can be connected. */
	onConnect?: (from: string, to: string | null) => void;
	/** The canvas's act, at the foot's centre. */
	act?: Act;
}

const NO_EDGES: readonly CanvasEdge[] = [];
const NO_GROUPS: readonly CanvasGroup[] = [];
const NO_SIZES: ReadonlyMap<string, Size> = new Map();
const NO_POINTS: ReadonlyMap<string, CanvasPoint> = new Map();

const REGION =
	"relative flex flex-col grow min-h-0 min-w-0 overflow-hidden touch-none";
const HIDDEN = "opacity-0";
const GRID = "absolute inset-0 size-full text-grid";
const LAYER = "absolute left-0 top-0";
const FLOW = "flex items-center";
const COLUMN = "flex flex-col";
const PROBE = "invisible absolute flex flex-col items-start";
const NBSP = "\u00a0";

/** A graph of nodes and edges, laid out and pannable; read-only until it is given `onSelect`, `onMove` or `onConnect`. */
export function Canvas({
	label,
	nodes,
	edges = NO_EDGES,
	groups = NO_GROUPS,
	selected,
	onSelect,
	path,
	onMove,
	onConnect,
	act,
}: CanvasProps) {
	const grid = useId();
	const region = useRef<HTMLElement>(null);
	const viewport = useViewport(region);
	const touch = useTouch();
	// One flag for the whole canvas, true while the smallest text a node draws
	// renders under the text floor: a crossing renders once, and a pan or a zoom
	// within a side renders nothing.
	const below = useViewportValue(viewport, (view) =>
		belowFloor(view.k, TEXT_FLOOR, TEXT_FLOOR),
	);
	const [sizes, setSizes] = useState(NO_SIZES);
	const [probe, setProbe] = useState<HTMLElement | null>(null);
	const order = useMemo(() => pathOrder(nodes, edges), [nodes, edges]);
	const chipped = edges.filter(
		(edge) => edge.label !== undefined || edge.handoff,
	);
	const probed = groups.length > 0 || chipped.length > 0;
	// The one live position of each node a drag holds, set only through `at` and
	// cleared on release; where a landing put a node; and the link being drawn.
	const [live, setLive] = useState(NO_POINTS);
	const [landed, setLanded] = useState(NO_POINTS);
	const [link, setLink] = useState<{
		from: string;
		to: CanvasPoint;
		target: string | null;
	} | null>(null);
	const { boxes, routed, space, ready, arrange } = useLayout({
		nodes,
		edges,
		groups,
		order,
		sizes,
		region,
		viewport,
		probe,
		probed,
		probeKey: `${groups.map((group) => group.id + group.head).join()}:${chipped.map((edge) => edge.id).join()}`,
		live,
		landed,
		onMove,
		ports: Boolean(onConnect),
		glyph: glyphSize(touch),
	});

	// The lowest zoom at which no two glyphs stand closer than the gap the edges
	// between them need.
	const minZoom = useMemo(
		() => minZoomFor([...boxes.values()], glyphSize(touch), space.pair),
		[boxes, touch, space.pair],
	);
	useEffect(() => viewport.limit(minZoom), [viewport, minZoom]);
	// The glyph and a port's hit hold their size on screen at any zoom through
	// this variable, set by script so a pinch renders nothing.
	useEffect(() => {
		const element = region.current;
		const set = () =>
			element?.style.setProperty(UNZOOM_VAR, String(1 / viewport.get().k));
		set();
		return viewport.subscribe(set);
	}, [viewport]);

	const at = useCallback((id: string, point: CanvasPoint | null) => {
		setLive((last) => {
			if (point === null && !last.has(id)) return last;
			const next = new Map(last);
			if (point === null) next.delete(id);
			else next.set(id, point);
			return next;
		});
	}, []);
	const drop = useCallback(
		(id: string, point: CanvasPoint) => {
			onMove?.(id, point);
			at(id, null);
		},
		[onMove, at],
	);
	const linking = useCallback(
		(from: string, to: CanvasPoint | null, target: string | null) => {
			setLink(to && { from, to, target });
		},
		[],
	);

	// A node with no position among nodes that have one lands with its centre on
	// the viewport's, and is chosen. When none has a position the layout places
	// them all, so nothing lands. The ids a landing has seen keep a node from
	// landing twice; an id that leaves `nodes` leaves with it.
	const seen = useRef(new Set<string>());
	const positioned = nodes.some((node) => node.position);
	useLayoutEffect(() => {
		const present = new Set(nodes.map((node) => node.id));
		const gone = [...seen.current].filter((id) => !present.has(id));
		const pane = region.current?.getBoundingClientRect();
		const fresh =
			ready && pane && positioned
				? nodes.filter(
						(node) =>
							!node.position &&
							!seen.current.has(node.id) &&
							sizes.has(node.id),
					)
				: [];
		if (gone.length === 0 && fresh.length === 0) return;
		const spots = fresh.flatMap((node) => {
			const size = sizes.get(node.id);
			if (!size || !pane) return [];
			const centre = viewport.screenToFlow({
				x: pane.left + pane.width / 2,
				y: pane.top + pane.height / 2,
			});
			return [[node.id, landAt(centre, size)] as const];
		});
		for (const id of gone) seen.current.delete(id);
		setLanded((last) => {
			const next = new Map(last);
			for (const id of gone) next.delete(id);
			for (const [id, spot] of spots) next.set(id, spot);
			return next;
		});
		for (const [id, spot] of spots) {
			seen.current.add(id);
			onMove?.(id, spot);
			onSelect?.(id);
		}
	}, [nodes, sizes, ready, positioned, viewport, onMove, onSelect]);

	// A node writes its size only when it changed.
	const resized = useCallback((id: string, size: Size) => {
		setSizes((last) => {
			const old = last.get(id);
			if (old?.width === size.width && old.height === size.height) return last;
			return new Map(last).set(id, size);
		});
	}, []);

	const reveal = (id: string) => {
		const box = boxes.get(id);
		if (box) viewport.centreOn(box);
	};
	// A selection from outside brings its node into view; one the pointer made
	// is already in view.
	const follow = useEffectEvent(reveal);
	useEffect(() => {
		if (selected !== undefined) follow(selected);
	}, [selected]);

	const byId = new Map(nodes.map((node) => [node.id, node]));
	const source = link ? boxes.get(link.from) : undefined;
	const tones = new Map<string, EdgeTone>(
		edges.map((edge) => [edge.id, edgeLook(edge, byId, path)]),
	);

	// Escape clears the selection from anywhere inside the region.
	const clear = (event: KeyboardEvent) => {
		if (event.key === "Escape" && selected !== undefined) onSelect?.(null);
	};
	// A click on the ground clears it. d3 swallows the click that ends a drag,
	// so a pan never gets here.
	const ground = (event: MouseEvent) => {
		const target = event.target;
		if (
			region.current &&
			target instanceof Element &&
			isGround(target, region.current)
		)
			onSelect?.(null);
	};
	const edit: NodeEdit = {
		viewport,
		region,
		touch,
		draggable: Boolean(onMove) && !touch && !below,
		liftable: Boolean(onMove) && touch && !below,
		ports: Boolean(onConnect) && !below,
		at,
		drop,
		linking,
		onConnect,
	};

	return (
		<section
			ref={region}
			aria-label={label}
			data-fill
			onKeyDown={clear}
			onClick={onSelect ? ground : undefined}
			className={cn(CANVAS_GROUND, REGION, !ready && HIDDEN)}
		>
			<svg aria-hidden="true" data-ground className={GRID}>
				<defs>
					<pattern id={grid} data-grid patternUnits="userSpaceOnUse">
						<circle fill="currentColor" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill={`url(#${grid})`} />
			</svg>
			<div data-layer className={LAYER}>
				{groups.map((group) => {
					const frame = routed.frames.get(group.id);
					return frame ? (
						<GroupFrame
							key={group.id}
							id={group.id}
							head={group.head}
							box={frame}
							below={below}
						/>
					) : null;
				})}
				<EdgeLayer
					edges={edges}
					routes={routed.routes}
					tones={tones}
					radius={space.pair}
					below={below}
				/>
				{order.map((id) => {
					const node = byId.get(id);
					if (!node) return null;
					return (
						<NodeView
							key={id}
							node={node}
							look={nodeLook(node, selected, path)}
							box={boxes.get(id) ?? place(node, { live, landed })}
							landing={positioned && !node.position && !landed.has(id)}
							lifted={live.has(id)}
							targeted={link?.target === id}
							below={below}
							edit={edit}
							onSelect={onSelect}
							onSize={resized}
							onFocusVisible={reveal}
						/>
					);
				})}
				{link && source ? (
					<ConnectionLine from={source} to={link.to} pair={space.pair} />
				) : null}
			</div>
			<ZoomStack
				viewport={viewport}
				bounds={routed.bounds}
				minZoom={minZoom}
				onArrange={onMove ? arrange : undefined}
			/>
			{act ? <ActFoot act={act} /> : null}
			{probed ? (
				<div ref={setProbe} aria-hidden="true" className={PROBE}>
					{groups.map((group) => (
						<div
							key={group.id}
							data-head={group.id}
							className={cn(CANVAS_GROUP, COLUMN)}
						>
							<div className={cn(CANVAS_GROUP_HEAD, FLOW)}>
								<span>{group.head || NBSP}</span>
							</div>
						</div>
					))}
					{chipped.map((edge) => (
						<div key={edge.id} data-label={edge.id}>
							<EdgeLabel label={edge.label} handoff={edge.handoff ?? false} />
						</div>
					))}
				</div>
			) : null}
		</section>
	);
}

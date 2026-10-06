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
	useMemo,
	useRef,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { EdgeLayer } from "./edges.tsx";
import type { Size } from "./geometry.ts";
import { GroupFrame } from "./group.tsx";
import { EdgeLabel } from "./label.tsx";
import { useLayout } from "./layout.ts";
import { nodeLook } from "./look.ts";
import { NodeView } from "./node.tsx";
import { useViewport } from "./viewport.ts";
import { ActFoot, ZoomStack } from "./zoom.tsx";

/** A graph of nodes and edges on a pannable, zoomable ground. */
export interface CanvasProps extends Closed {
	/** What the graph is, read as its region's name. */
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
const ORIGIN: CanvasPoint = { x: 0, y: 0 };

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
	onMove,
	act,
}: CanvasProps) {
	const grid = useId();
	const region = useRef<HTMLElement>(null);
	const viewport = useViewport(region);
	const [sizes, setSizes] = useState(NO_SIZES);
	const [probe, setProbe] = useState<HTMLElement | null>(null);
	const order = useMemo(() => pathOrder(nodes, edges), [nodes, edges]);
	const chipped = edges.filter(
		(edge) => edge.label !== undefined || edge.handoff,
	);
	const probed = groups.length > 0 || chipped.length > 0;
	const { boxes, routed, space, ready } = useLayout({
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
		onMove,
	});

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

	// Escape clears the selection from anywhere inside the region.
	const clear = (event: KeyboardEvent) => {
		if (event.key === "Escape" && selected !== undefined) onSelect?.(null);
	};
	// A click on the ground clears it. d3 swallows the click that ends a drag,
	// so a pan never gets here.
	const ground = (event: MouseEvent) => {
		const target = event.target;
		if (target instanceof Element && target.closest("button, [data-no-pan]"))
			return;
		onSelect?.(null);
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
			<svg aria-hidden="true" className={GRID}>
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
						<GroupFrame key={group.id} head={group.head} box={frame} />
					) : null;
				})}
				<EdgeLayer edges={edges} routes={routed.routes} radius={space.pair} />
				{order.map((id) => {
					const node = byId.get(id);
					if (!node) return null;
					return (
						<NodeView
							key={id}
							node={node}
							look={nodeLook(node, selected)}
							box={boxes.get(id) ?? node.position ?? ORIGIN}
							onSelect={onSelect}
							onSize={resized}
							onFocusVisible={reveal}
						/>
					);
				})}
			</div>
			<ZoomStack viewport={viewport} bounds={routed.bounds} />
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

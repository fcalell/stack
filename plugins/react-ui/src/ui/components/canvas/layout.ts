import { backEdges } from "@fcalell/ui-core/canvas";
import type {
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
	CanvasPoint,
} from "@fcalell/ui-core/descriptors";
import { WIDTH_VALUE } from "@fcalell/ui-core/tokens";
import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { spacing } from "../../lib/media.ts";
import { elkGraph, fromElk, type Gaps, graphKey, layerGap } from "./elk.ts";
import { glyphBoxes, routeSide } from "./floor.ts";
import {
	type Box,
	leftPads,
	type Routes,
	routeEdges,
	type Size,
} from "./geometry.ts";
import { openTransform, type Places, place } from "./view.ts";
import { useViewportValue, type Viewport } from "./viewport.ts";

// The sizes a layout is drawn by, from the spacing roles at the density in
// force: a layer gap holds the router's bend and a label chip with air round
// it.
export interface Space {
	pad: number;
	pair: number;
	// A port ring's drawn size.
	port: number;
	gaps: Gaps;
}

export function spaces(chip: number): Space {
	const pair = spacing("pair");
	return {
		pad: spacing("card"),
		pair,
		port: Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--spacing-port",
			),
		),
		gaps: {
			node: spacing("card"),
			layer: layerGap(spacing("sections"), chip, pair),
			page: spacing("page"),
		},
	};
}

// What the hidden probe measures: the height of a group head, how far each
// group's head text reaches from its frame's left edge, and each chip's size,
// by edge id.
export interface Measures {
	head: number;
	reach: ReadonlyMap<string, number>;
	labels: ReadonlyMap<string, Size>;
}

const NONE: Measures = { head: 0, reach: new Map(), labels: new Map() };

const sameMap = <T>(
	a: ReadonlyMap<string, T>,
	b: ReadonlyMap<string, T>,
	same: (one: T, two: T) => boolean,
) =>
	a.size === b.size &&
	[...b].every(([id, value]) => {
		const last = a.get(id);
		return last !== undefined && same(last, value);
	});

const sameMeasures = (a: Measures, b: Measures) =>
	a.head === b.head &&
	sameMap(a.reach, b.reach, (one, two) => one === two) &&
	sameMap(
		a.labels,
		b.labels,
		(one, two) => one.width === two.width && one.height === two.height,
	);

// Reads the probe's parts (one `data-head` per group, one `data-label` per
// edge) and reads them again when any of them resizes. `null` until the first
// read.
function useMeasures(probe: HTMLElement | null, key: string): Measures | null {
	const [measures, setMeasures] = useState<Measures | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` names the probe's parts, which the observer must be given again when they change.
	useLayoutEffect(() => {
		if (!probe) return;
		const read = () => {
			const labels = new Map<string, Size>();
			for (const part of probe.querySelectorAll<HTMLElement>("[data-label]")) {
				const { width, height } = part.getBoundingClientRect();
				labels.set(part.dataset.label ?? "", { width, height });
			}
			// A probe frame holds its head, whose text ends where its span does.
			const reach = new Map<string, number>();
			let head = 0;
			for (const frame of probe.querySelectorAll<HTMLElement>("[data-head]")) {
				const text = frame.querySelector("span")?.getBoundingClientRect();
				const row = frame.firstElementChild?.getBoundingClientRect();
				head = Math.max(head, Math.ceil(row?.height ?? 0));
				reach.set(
					frame.dataset.head ?? "",
					(text?.right ?? 0) - frame.getBoundingClientRect().left,
				);
			}
			const next = { head, reach, labels };
			setMeasures((last) => (last && sameMeasures(last, next) ? last : next));
		};
		read();
		const watch = new ResizeObserver(read);
		for (const part of probe.children) watch.observe(part);
		return () => watch.disconnect();
	}, [probe, key]);
	return measures;
}

const WIDTH = Number.parseFloat(WIDTH_VALUE.node);

// A box of the flow for each node whose place and size are known.
function boxesOf(
	nodes: readonly CanvasNode[],
	places: Places,
	sizes: ReadonlyMap<string, Size>,
): Map<string, Box> {
	const boxes = new Map<string, Box>();
	for (const node of nodes) {
		const size = sizes.get(node.id);
		if (size) boxes.set(node.id, { ...place(node, places), ...size });
	}
	return boxes;
}

// One run of the layout. Each is its own object, so a rerun for the same
// structure (Arrange) is reported again.
interface Laid {
	positions: ReadonlyMap<string, CanvasPoint>;
	// It came from Arrange, which fits the view once it is reported.
	arranged: boolean;
}

interface LayoutArgs {
	nodes: readonly CanvasNode[];
	edges: readonly CanvasEdge[];
	groups: readonly CanvasGroup[];
	order: readonly string[];
	sizes: ReadonlyMap<string, Size>;
	region: RefObject<HTMLElement | null>;
	viewport: Viewport;
	// The hidden probe, and whether anything needs it (a group head or a chip).
	probe: HTMLElement | null;
	probed: boolean;
	// The probe's parts, so the observer is given them again when they change.
	probeKey: string;
	// The positions a drag holds and a landing chose, which `place` reads.
	live: ReadonlyMap<string, CanvasPoint>;
	landed: ReadonlyMap<string, CanvasPoint>;
	onMove?: (id: string, position: CanvasPoint) => void;
	// Each node draws an in port.
	ports: boolean;
	// A glyph's size on screen at the density: under the text floor the routes
	// and the frames follow it.
	glyph: number;
}

export interface Layout {
	boxes: ReadonlyMap<string, Box>;
	routed: Routes;
	space: Space;
	// The graph is placed and the first view set, so it may show.
	ready: boolean;
	// Runs the layout again, every position ignored, and fits the view to it.
	arrange: () => void;
}

// Measures, decides, runs, reports, routes and opens the first view. ELK
// places nodes when no node has a position, once every node is measured and
// the probe read, and not again for the same structure; Arrange runs it again
// whatever the positions. Its worker is imported when first wanted: a graph
// the consumer placed never loads it.
export function useLayout({
	nodes,
	edges,
	groups,
	order,
	sizes,
	region,
	viewport,
	probe,
	probed,
	probeKey,
	live,
	landed,
	onMove,
	ports,
	glyph,
}: LayoutArgs): Layout {
	const key = graphKey(nodes, edges, groups);
	const placing = nodes.length > 0 && nodes.every((node) => !node.position);
	const measured = nodes.every((node) => sizes.has(node.id));
	const read = useMeasures(probe, probeKey);
	const measures = probed ? read : NONE;
	const [laid, setLaid] = useState<Laid | null>(null);
	const [ready, setReady] = useState(false);
	const current = useRef(key);
	const ran = useRef<string | null>(null);
	// A run is in flight from its request to its result.
	const flight = useRef(false);
	const reported = useRef<Laid | null>(null);

	useEffect(() => {
		current.current = key;
	}, [key]);

	// ELK's input is sizes, never positions, so any run is the same layout.
	const run = useCallback(
		(at: string, arranged: boolean) => {
			if (!measures) return;
			flight.current = true;
			const chip = Math.max(
				0,
				...[...measures.labels.values()].map((s) => s.height),
			);
			const { pad, pair, gaps } = spaces(chip);
			const graph = elkGraph({
				nodes,
				edges,
				groups,
				order,
				sizes,
				head: measures.head,
				pad,
				left: leftPads(groups, measures.reach, { pad, pair, width: WIDTH }),
				gaps,
			});
			void import("@fcalell/plugin-react-ui/lib/canvas-layout")
				.then(({ layoutElk }) => layoutElk(graph))
				.then((output) => {
					flight.current = false;
					if (current.current === at)
						setLaid({ positions: fromElk(output), arranged });
				});
		},
		[measures, nodes, edges, groups, order, sizes],
	);

	useEffect(() => {
		if (!placing || !measured || !measures || ran.current === key) return;
		ran.current = key;
		run(key, false);
	}, [placing, measured, measures, key, run]);

	const arrange = () => {
		if (flight.current || !measured || !measures) return;
		run(key, true);
	};

	// What the router drew last, so Arrange fits the bounds the consumer's
	// positions produced and not the ones the run was asked from.
	const latest = useRef<Routes | null>(null);
	useEffect(() => {
		if (!onMove || !laid || reported.current === laid) return;
		reported.current = laid;
		for (const id of order) {
			const at = laid.positions.get(id);
			if (at) onMove(id, at);
		}
		// The consumer's positions commit before the frame.
		if (laid.arranged)
			requestAnimationFrame(() => {
				if (latest.current) viewport.fit(latest.current.bounds);
			});
	}, [laid, onMove, order, viewport]);

	const chip = Math.max(
		0,
		...[...(measures?.labels.values() ?? [])].map((s) => s.height),
	);
	const space = spaces(chip);
	const computed = laid?.positions;
	const boxes = useMemo(
		() => boxesOf(nodes, { live, landed, computed }, sizes),
		[nodes, live, landed, computed, sizes],
	);
	const back = useMemo(() => backEdges(order, edges), [order, edges]);
	const { pad, pair, port } = space;
	// Under the floor a node is its glyph, so the routes and the frames follow
	// the glyph's box, centred on the card's, and not the card's. ELK's positions
	// and the cards' sizes stay as they are. The side moves in steps of a `pair`,
	// which bounds how often the routes are drawn while the zoom moves.
	const side = useViewportValue(viewport, (view) =>
		routeSide(view.k, glyph, spacing("pair")),
	);
	const solids = useMemo(
		() => (side > 0 ? glyphBoxes(boxes, side) : boxes),
		[boxes, side],
	);
	const head = measures?.head ?? 0;
	const labels = measures?.labels;
	const reach = measures?.reach;
	const routed = useMemo(
		() =>
			routeEdges({
				boxes: solids,
				edges,
				back,
				groups,
				labels: labels ?? NONE.labels,
				head,
				pad,
				left: leftPads(groups, reach ?? NONE.reach, {
					pad,
					pair,
					width: WIDTH,
				}),
				pair,
				// A glyph draws no port.
				ports: ports && side === 0,
				port,
			}),
		[
			solids,
			edges,
			back,
			groups,
			labels,
			reach,
			head,
			pad,
			pair,
			ports,
			side,
			port,
		],
	);

	useLayoutEffect(() => {
		latest.current = routed;
	}, [routed]);

	const placed = !placing || laid !== null;
	useLayoutEffect(() => {
		const element = region.current;
		if (ready || !element || !measured || !placed || !measures) return;
		viewport.set(
			openTransform(
				routed.bounds,
				boxes.get(order[0] ?? ""),
				{ width: element.clientWidth, height: element.clientHeight },
				spacing("page"),
				viewport.clearance(),
			),
		);
		setReady(true);
	}, [
		ready,
		measured,
		placed,
		measures,
		routed,
		boxes,
		order,
		region,
		viewport,
	]);

	return { boxes, routed, space, ready, arrange };
}

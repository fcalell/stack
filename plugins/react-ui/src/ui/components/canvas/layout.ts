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
import { glyphBoxes, minZoomFor, routeSide } from "./floor.ts";
import {
	type Box,
	hollowRow,
	leftPads,
	type Routes,
	routeEdges,
	type Size,
} from "./geometry.ts";
import { fitTransform, type Places, place, type Transform } from "./view.ts";
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
	// `pathOrder` of the nodes and the empty groups, which are leaves the layout
	// places and no node: they take no position of the consumer's and no `onMove`.
	order: readonly string[];
	hollow: readonly string[];
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
	// The nodes' boxes.
	boxes: ReadonlyMap<string, Box>;
	routed: Routes;
	space: Space;
	// The graph is placed and the first view set, so it may show.
	ready: boolean;
	// Puts the whole graph in the room the pane leaves, at the scale that holds
	// it: the Fit act's view and the one the graph opens at.
	fit: () => void;
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
	hollow,
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
	const placing =
		(nodes.length > 0 || hollow.length > 0) &&
		nodes.every((node) => !node.position);
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

	// The latest fit, so Arrange fits the bounds the consumer's positions
	// produced and not the ones the run was asked from.
	const latest = useRef<(() => void) | null>(null);
	useEffect(() => {
		if (!onMove || !laid || reported.current === laid) return;
		reported.current = laid;
		for (const id of order) {
			const at = laid.positions.get(id);
			if (at && !hollow.includes(id)) onMove(id, at);
		}
		// The consumer's positions commit before the frame.
		if (laid.arranged)
			requestAnimationFrame(() => {
				latest.current?.();
			});
	}, [laid, onMove, order, hollow]);

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
	const head = measures?.head ?? 0;
	// An empty group stands where the layout put it, at the size of its head and
	// padding. Where no layout ran (every node has a position) the ones left
	// stand in one row below the nodes, in path order. Under the floor it keeps
	// its frame, as every frame does.
	const { node: across, layer: down } = space.gaps;
	const holes = useMemo(() => {
		const size = { width: WIDTH, height: head + 2 * pad };
		const out = new Map<string, Box>();
		for (const id of hollow) {
			const at = computed?.get(id);
			if (at) out.set(id, { ...at, ...size });
		}
		const unplaced = order.filter((id) => hollow.includes(id) && !out.has(id));
		const row = hollowRow(unplaced, boxes.values(), size, {
			gap: across,
			drop: down,
		});
		for (const [id, box] of row) out.set(id, box);
		return out;
	}, [hollow, order, computed, boxes, head, pad, across, down]);
	// Under the floor a node is its glyph, so the routes and the frames follow
	// the glyph's box, centred on the card's, and not the card's. ELK's positions
	// and the cards' sizes stay as they are. The side moves in steps of a `pair`,
	// which bounds how often the routes are drawn while the zoom moves.
	const side = useViewportValue(viewport, (view) =>
		routeSide(view.k, glyph, spacing("pair")),
	);
	const labels = measures?.labels;
	const reach = measures?.reach;
	// What a graph routes to and frames at a routing side: the cards' boxes above
	// the floor (side 0), the glyphs' squares under it, where a group's head draws
	// at its own size on screen, so the band it covers and the padding round the
	// glyphs grow by what the zoom takes: the side's step over the glyph.
	const routeAt = useCallback(
		(at: number) => {
			const grow = at > 0 ? at / glyph : 1;
			return routeEdges({
				boxes: new Map([...(at > 0 ? glyphBoxes(boxes, at) : boxes), ...holes]),
				edges,
				back,
				groups,
				labels: labels ?? NONE.labels,
				head: head * grow,
				pad: pad * grow,
				left: leftPads(groups, reach ?? NONE.reach, {
					pad,
					pair,
					width: WIDTH,
				}),
				pair,
				// A glyph draws no port.
				ports: ports && at === 0,
				port,
			});
		},
		[
			boxes,
			holes,
			edges,
			back,
			groups,
			labels,
			reach,
			head,
			pad,
			glyph,
			pair,
			ports,
			port,
		],
	);
	const routed = useMemo(() => routeAt(side), [routeAt, side]);

	// The view that holds the whole graph. Under the floor the frames and the
	// routes follow the zoom (a head and a padding keep their size on screen),
	// so the bounds depend on the scale they are fitted to: the fit is taken
	// again at the scale it gave, down until the bounds at that scale fit it.
	const fitted = useCallback((): Transform | null => {
		const element = region.current;
		if (!element) return null;
		const pane = { width: element.clientWidth, height: element.clientHeight };
		const view = (bounds: Box) =>
			fitTransform(bounds, pane, spacing("page"), viewport.clearance());
		const stand = (k: number) =>
			view(routeAt(routeSide(k, glyph, spacing("pair"))).bounds);
		let at = view(routeAt(0).bounds);
		for (let step = 0; step < 6; step++) {
			const next = stand(at.k);
			if (next.k >= at.k - 1e-3) return next;
			at = next;
		}
		return at;
	}, [region, viewport, routeAt, glyph]);
	const fit = useCallback(() => {
		const view = fitted();
		if (!view) return;
		// The lowest scale is the one these boxes allow, which the canvas sets after
		// it renders: a view set before it (the opening one) must not meet the last
		// graph's.
		viewport.limit(minZoomFor([...boxes.values()], glyph, spacing("pair")));
		viewport.set(view);
	}, [fitted, viewport, boxes, glyph]);
	useLayoutEffect(() => {
		latest.current = fit;
	}, [fit]);

	const placed = !placing || laid !== null;
	useLayoutEffect(() => {
		const element = region.current;
		if (ready || !element || !measured || !placed || !measures) return;
		// The graph opens as Fit shows it: whole in the room the pane leaves.
		fit();
		setReady(true);
	}, [ready, measured, placed, measures, region, fit]);

	return { boxes, routed, space, ready, fit, arrange };
}

import { backEdges } from "@fcalell/ui-core/canvas";
import type {
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
	CanvasPoint,
} from "@fcalell/ui-core/descriptors";
import { WIDTH_VALUE } from "@fcalell/ui-core/tokens";
import type { ElkNode } from "elkjs/lib/elk-api.js";
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
import {
	type ElkInput,
	elkGraph,
	fromElk,
	type Gaps,
	graphKey,
	layerGap,
	wrapParts,
} from "./elk.ts";
import { glyphTier, minZoomFor, routeSide } from "./floor.ts";
import {
	type Box,
	hollowRow,
	leftPads,
	type Routes,
	routeEdges,
	type Size,
} from "./geometry.ts";
import {
	FIT_FLOOR,
	fitTransform,
	type Places,
	place,
	type Transform,
} from "./view.ts";
import {
	type About,
	clearanceOf,
	useViewportValue,
	type Viewport,
} from "./viewport.ts";

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
	const pair = spacing("gap");
	return {
		pad: spacing("pad"),
		pair,
		port: Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--spacing-port",
			),
		),
		gaps: {
			node: spacing("pad"),
			layer: layerGap(spacing("section"), chip, pair),
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
function useMeasures(probe: HTMLElement | null): Measures | null {
	const [measures, setMeasures] = useState<Measures | null>(null);
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
	}, [probe]);
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
	// ELK's own output, whose top parts wrap in a narrow room (`wrapParts`).
	output: ElkNode;
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
	// The hidden probe (a new element when its parts change, so the observer is
	// given them again), and whether anything needs it (a group head or a chip).
	probe: HTMLElement | null;
	probed: boolean;
	// The positions a drag holds and a landing chose, which `place` reads.
	live: ReadonlyMap<string, CanvasPoint>;
	landed: ReadonlyMap<string, CanvasPoint>;
	onMove?: (id: string, position: CanvasPoint) => void;
	// Each node draws an in port.
	ports: boolean;
	// A glyph's size on screen at the density: under the text floor the routes
	// and the frames follow it.
	glyph: number;
	// The node the viewer chose: a resized pane keeps it in view.
	selected?: string;
}

export interface Layout {
	// The nodes' boxes, as placed.
	boxes: ReadonlyMap<string, Box>;
	// Where each node draws at the zoom in force: as placed above the text
	// floor, spread under it by the group heads' growth (`glyphTier`).
	drawn: ReadonlyMap<string, Box>;
	// Where a node stands at a scale, which a zoom about it holds it by.
	about: (id: string) => About;
	routed: Routes;
	space: Space;
	// The graph is placed and the first view set, so it may show.
	ready: boolean;
	// The Fit act's view: the whole graph in the room the pane leaves, at the
	// scale that holds it down to the lowest the boxes allow. The graph opens
	// (and opens again when its pane resizes) at the same view floored at
	// `FIT_FLOOR`, framed at its first node where it holds only under it.
	fit: () => void;
	// Runs the layout again, every position ignored, and fits the view to it.
	arrange: () => void;
	// How far the zoom stack's column reaches in from the pane's start, a
	// `pair` past it: a group head's words start past it (`headShift`).
	clearLeft: number;
}

// Measures, decides, runs, reports, routes and opens the first view. ELK
// places nodes when no node has a position, once every node is measured and
// the probe read, and not again for the same input (`graphKey`); Arrange runs it again
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
	live,
	landed,
	onMove,
	ports,
	glyph,
	selected,
}: LayoutArgs): Layout {
	const placing =
		(nodes.length > 0 || hollow.length > 0) &&
		nodes.every((node) => !node.position);
	const measured = nodes.every((node) => sizes.has(node.id));
	const read = useMeasures(probe);
	const measures = probed ? read : NONE;
	// What ELK reads: sizes, never positions, so any run of the same input is the
	// same layout. A node's height is its measured one, so a node that grows
	// after a run (a gate whose answers' words gain a line) runs it again.
	const input = useMemo((): ElkInput | null => {
		if (!measures) return null;
		const chip = Math.max(
			0,
			...[...measures.labels.values()].map((s) => s.height),
		);
		const { pad, pair, gaps } = spaces(chip);
		return {
			nodes,
			edges,
			groups,
			order,
			sizes,
			head: measures.head,
			pad,
			left: leftPads(groups, measures.reach, { pad, pair, width: WIDTH }),
			gaps,
		};
	}, [measures, nodes, edges, groups, order, sizes]);
	const key = useMemo(() => (input ? graphKey(input) : null), [input]);
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

	// A run's result lands only while its input is still the one in force.
	const run = useCallback((given: ElkInput, at: string, arranged: boolean) => {
		flight.current = true;
		const graph = elkGraph(given);
		void import("@fcalell/plugin-react-ui/lib/canvas-layout")
			.then(({ layoutElk }) => layoutElk(graph))
			.then((output) => {
				flight.current = false;
				if (current.current === at)
					setLaid({ positions: fromElk(output), output, arranged });
			});
	}, []);

	useEffect(() => {
		if (!placing || !measured || !input || !key || ran.current === key) return;
		ran.current = key;
		run(input, key, false);
	}, [placing, measured, input, key, run]);

	const arrange = () => {
		if (flight.current || !measured || !input || !key) return;
		run(input, key, true);
	};

	// The width the opening view has at the text floor: the pane less its inset
	// and the zoom stack's clearance, as `fitTransform`'s room. The parts of a
	// graph no edge links wrap to it (`wrapParts`), so it is read here and again
	// as the pane resizes: CSS cannot place what ELK placed.
	const [room, setRoom] = useState(Number.POSITIVE_INFINITY);
	const [clearLeft, setClearLeft] = useState(0);
	useLayoutEffect(() => {
		const element = region.current;
		if (!element) return;
		const read = () => {
			const inset = spacing("page");
			const clear = clearanceOf(element);
			setRoom(element.clientWidth - inset - Math.max(inset, clear.left));
			setClearLeft(clear.left);
		};
		read();
		const watch = new ResizeObserver(read);
		watch.observe(element);
		return () => watch.disconnect();
	}, [region]);
	const chip = Math.max(
		0,
		...[...(measures?.labels.values() ?? [])].map((s) => s.height),
	);
	const space = spaces(chip);
	const { node: across, layer: down } = space.gaps;
	const computed = useMemo(
		() =>
			laid
				? wrapParts(laid.output, laid.positions, edges, room, { across, down })
				: undefined,
		[laid, edges, room, across, down],
	);

	// The latest fit, so Arrange fits the bounds the consumer's positions
	// produced and not the ones the run was asked from.
	const latest = useRef<(() => void) | null>(null);
	useEffect(() => {
		if (!onMove || !laid || !computed || reported.current === laid) return;
		reported.current = laid;
		for (const id of order) {
			const at = computed.get(id);
			if (at && !hollow.includes(id)) onMove(id, at);
		}
		// The consumer's positions commit before the frame.
		if (laid.arranged)
			requestAnimationFrame(() => {
				latest.current?.();
			});
	}, [laid, computed, onMove, order, hollow]);

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
	// the glyph's box, centred on the card's, and not the card's. The cards'
	// sizes stay as they are, and their places only spread (`glyphTier`). The
	// side moves in steps of a `pair`, which bounds how often the routes are
	// drawn while the zoom moves.
	const side = useViewportValue(viewport, (view) =>
		routeSide(view.k, glyph, spacing("gap")),
	);
	const labels = measures?.labels;
	const reach = measures?.reach;
	const lefts = useMemo(
		() => leftPads(groups, reach ?? NONE.reach, { pad, pair, width: WIDTH }),
		[groups, reach, pad, pair],
	);
	// What a graph draws, routes to and frames at a routing side: the cards'
	// boxes above the floor (side 0), the glyphs' squares under it, where a
	// group's head draws at its own size on screen, so the band it covers and
	// the padding round the glyphs grow by what the zoom takes (the side's step
	// over the glyph) and the nodes spread by that growth (`glyphTier`).
	const tierAt = useCallback(
		(at: number) =>
			glyphTier(boxes, holes, groups, {
				side: at,
				glyph,
				head,
				pad,
				left: lefts,
			}),
		[boxes, holes, groups, glyph, head, pad, lefts],
	);
	const routeTier = useCallback(
		(at: number, tier: ReturnType<typeof glyphTier>) =>
			routeEdges({
				boxes: tier.boxes,
				edges,
				back,
				groups,
				labels: labels ?? NONE.labels,
				head: tier.head,
				pad: tier.pad,
				left: lefts,
				pair,
				// A glyph draws no port.
				ports: ports && at === 0,
				port,
			}),
		[edges, back, groups, labels, lefts, pair, ports, port],
	);
	const tier = useMemo(() => tierAt(side), [tierAt, side]);
	const drawn = tier.cards;
	const routed = useMemo(() => routeTier(side, tier), [routeTier, side, tier]);
	const about = useCallback(
		(id: string): About =>
			(k: number) =>
				tierAt(routeSide(k, glyph, spacing("gap"))).cards.get(id),
		[tierAt, glyph],
	);

	// The view that holds the whole graph. Under the floor the frames and the
	// routes follow the zoom (a head and a padding keep their size on screen),
	// so the bounds depend on the scale they are fitted to: the fit is taken
	// again at the scale it gave, down until the bounds at that scale fit it.
	// `floor` is the lowest scale it takes: the text floor for the opening view,
	// the lowest the boxes allow for the Fit act.
	const fitted = useCallback(
		(floor: number): Transform | null => {
			const element = region.current;
			if (!element) return null;
			const pane = { width: element.clientWidth, height: element.clientHeight };
			// A node's icon stands past its inline padding, in a box no wider than a
			// control (a decision's diamond).
			const inline = spacing("pad");
			const icon = { start: inline, end: inline + spacing("control") };
			// A graph the floor cuts is framed at its first node.
			const first = order[0];
			const view = (at: number) => {
				const tier = tierAt(at);
				return fitTransform(
					routeTier(at, tier).bounds,
					pane,
					spacing("page"),
					viewport.clearance(),
					first === undefined ? undefined : tier.cards.get(first),
					{ nodes: [...tier.cards.values()], icon },
					floor,
				);
			};
			const stand = (k: number) => view(routeSide(k, glyph, spacing("gap")));
			let at = view(0);
			for (let step = 0; step < 6; step++) {
				const next = stand(at.k);
				if (next.k >= at.k - 1e-3) return next;
				at = next;
			}
			return at;
		},
		[region, viewport, tierAt, routeTier, glyph, order],
	);
	const fitTo = useCallback(
		(move: "set" | "go", whole: boolean) => {
			// The lowest scale is the one these boxes allow, which the canvas sets after
			// it renders: a view set before it (the opening one) must not meet the last
			// graph's.
			const lowest = minZoomFor([...boxes.values()], glyph, spacing("gap"));
			const view = fitted(whole ? lowest : FIT_FLOOR);
			if (!view) return;
			viewport.limit(lowest);
			viewport[move](view);
		},
		[fitted, viewport, boxes, glyph],
	);
	// The opening view and the one an Arrange fits to land at once, as the nodes
	// they follow do; the Fit act is the viewer's and travels.
	const open = useCallback(() => fitTo("set", false), [fitTo]);
	const fit = useCallback(() => fitTo("go", true), [fitTo]);
	useLayoutEffect(() => {
		latest.current = open;
	}, [open]);

	const placed = !placing || laid !== null;
	useLayoutEffect(() => {
		const element = region.current;
		if (ready || !element || !measured || !placed || !measures) return;
		// The graph opens as Fit shows it: whole in the room the pane leaves.
		open();
		setReady(true);
	}, [ready, measured, placed, measures, region, open]);
	// The opening view stands for the room it was set in. When the pane's size
	// changes (a Pane beside it opens or closes, the window resizes) the graph
	// opens again in the new room, at once; with a node chosen the view keeps
	// its scale and pans only as far as the chosen node needs to stand in the new
	// room (`centreOn`), so a sheet docked beside it leaves it in sight. The view
	// is a transform the script sets, so CSS cannot follow the room: the
	// region's size is read here.
	const chosen = useRef<Box | undefined>(undefined);
	useLayoutEffect(() => {
		chosen.current = selected === undefined ? undefined : drawn.get(selected);
	}, [selected, drawn]);
	useEffect(() => {
		const element = region.current;
		if (!ready || !element) return;
		let last = { width: element.clientWidth, height: element.clientHeight };
		const watch = new ResizeObserver(() => {
			const size = { width: element.clientWidth, height: element.clientHeight };
			if (size.width === last.width && size.height === last.height) return;
			last = size;
			const box = chosen.current;
			if (box) viewport.centreOn(box);
			else latest.current?.();
		});
		watch.observe(element);
		return () => watch.disconnect();
	}, [ready, region, viewport]);
	// Parts wrapped again for a resized room stand elsewhere: the graph opens
	// again on their boxes once they are drawn, or pans to the chosen node's new
	// place. A new layout is not this: its first view is the opening one, or
	// Arrange's fit.
	const wrappedFor = useRef<Laid | null>(null);
	useLayoutEffect(() => {
		if (!ready || !computed) return;
		if (wrappedFor.current === laid) {
			const box = chosen.current;
			if (box) viewport.centreOn(box);
			else latest.current?.();
		}
		wrappedFor.current = laid;
	}, [ready, computed, laid, viewport]);

	return {
		boxes,
		drawn,
		about,
		routed,
		space,
		ready,
		fit,
		arrange,
		clearLeft,
	};
}

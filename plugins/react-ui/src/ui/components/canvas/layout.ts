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
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { spacing } from "../../lib/media.ts";
import { elkGraph, fromElk, type Gaps, graphKey, layerGap } from "./elk.ts";
import {
	type Box,
	leftPads,
	type Routes,
	routeEdges,
	type Size,
} from "./geometry.ts";
import { openTransform } from "./view.ts";
import type { Viewport } from "./viewport.ts";

// The sizes a layout is drawn by, from the spacing roles at the density in
// force: a layer gap holds the router's bend and a label chip with air round
// it.
export interface Space {
	pad: number;
	pair: number;
	gaps: Gaps;
}

export function spaces(chip: number): Space {
	const pair = spacing("pair");
	return {
		pad: spacing("card"),
		pair,
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

const ORIGIN: CanvasPoint = { x: 0, y: 0 };
const WIDTH = Number.parseFloat(WIDTH_VALUE.node);

// A box of the flow for each node whose place and size are known.
function boxesOf(
	nodes: readonly CanvasNode[],
	computed: ReadonlyMap<string, CanvasPoint> | undefined,
	sizes: ReadonlyMap<string, Size>,
): Map<string, Box> {
	const boxes = new Map<string, Box>();
	for (const node of nodes) {
		const size = sizes.get(node.id);
		const at = node.position ?? computed?.get(node.id) ?? ORIGIN;
		if (size) boxes.set(node.id, { ...at, ...size });
	}
	return boxes;
}

interface Laid {
	key: string;
	positions: ReadonlyMap<string, CanvasPoint>;
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
	onMove?: (id: string, position: CanvasPoint) => void;
}

export interface Layout {
	boxes: ReadonlyMap<string, Box>;
	routed: Routes;
	space: Space;
	// The graph is placed and the first view set, so it may show.
	ready: boolean;
}

// Measures, decides, runs, reports, routes and opens the first view. ELK
// places nodes only when no node has a position, once every node is measured
// and the probe read, and not again for the same structure. Its worker is
// imported when first wanted: a graph the consumer placed never loads it.
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
	onMove,
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
	const reported = useRef<string | null>(null);

	useEffect(() => {
		current.current = key;
	}, [key]);

	useEffect(() => {
		if (!placing || !measured || !measures || ran.current === key) return;
		ran.current = key;
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
				if (current.current === key)
					setLaid({ key, positions: fromElk(output) });
			});
	}, [placing, measured, measures, key, nodes, edges, groups, order, sizes]);

	useEffect(() => {
		if (!onMove || !laid || reported.current === laid.key) return;
		reported.current = laid.key;
		for (const id of order) {
			const at = laid.positions.get(id);
			if (at) onMove(id, at);
		}
	}, [laid, onMove, order]);

	const chip = Math.max(
		0,
		...[...(measures?.labels.values() ?? [])].map((s) => s.height),
	);
	const space = spaces(chip);
	const boxes = useMemo(
		() => boxesOf(nodes, laid?.positions, sizes),
		[nodes, laid, sizes],
	);
	const back = useMemo(() => backEdges(order, edges), [order, edges]);
	const { pad, pair } = space;
	const head = measures?.head ?? 0;
	const labels = measures?.labels;
	const reach = measures?.reach;
	const routed = useMemo(
		() =>
			routeEdges({
				boxes,
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
			}),
		[boxes, edges, back, groups, labels, reach, head, pad, pair],
	);

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

	return { boxes, routed, space, ready };
}

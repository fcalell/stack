import type { CanvasPoint } from "@fcalell/ui-core/descriptors";

// Whether `element` is the region's ground: the region, its layer or its grid.
// Everything else inside (a node, the zoom stack, the act) is a part. The grid
// carries `data-ground`.
export function isGround(element: Element, region: Element): boolean {
	return (
		region.contains(element) &&
		(element === region ||
			element.matches("[data-layer], [data-ground], [data-ground] *"))
	);
}

// What lies under a client point: the node whose in port is there, and whether
// the topmost element is ground. `elementsFromPoint` lists every element at the
// point, so an in port is found where a later node's box overlaps its hit, and
// what a pointer capture redirects does not matter: this reads what is there.
export function hit(
	point: CanvasPoint,
	region: Element,
): { node: string | null; ground: boolean } {
	const stack = document.elementsFromPoint(point.x, point.y);
	const port = stack.find(
		(element) =>
			region.contains(element) && element.matches('[data-port="in"]'),
	);
	const top = stack[0];
	return {
		node: port instanceof HTMLElement ? (port.dataset.node ?? null) : null,
		ground: top !== undefined && isGround(top, region),
	};
}

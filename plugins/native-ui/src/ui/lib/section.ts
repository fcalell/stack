import type { ListInput, SectionParts } from "@fcalell/ui-core/list-state";
import {
	Children,
	createContext,
	Fragment,
	isValidElement,
	type ReactNode,
} from "react";

// Whether a `Section` stands around: an `EmptyState` in it draws its framed
// form, and a collection in it hands its busy state to the Section's head.
// The Section reads its collections off its own children in render, so
// nothing registers.
export const SectionContext = createContext(false);

// The components a Section reads its body by, passed in so this reading
// stays free of the components it names.
export interface SectionKinds {
	// Each counts and is a body of rows (a List, a Table).
	lists: readonly unknown[];
	// Each waits alone (a BarChart, a Comparison).
	waits: readonly unknown[];
	boundary: unknown;
	group: unknown;
	field: unknown;
}

// What a collection's element carries that its Section reads.
interface CollectionProps {
	query?: ListInput["query"];
	items?: readonly unknown[];
	loading?: boolean;
	definition?: unknown;
}

// What a QueryBoundary's element carries.
interface BoundaryProps {
	query: { isPending: boolean } | readonly { isPending: boolean }[];
	loading?: ReactNode;
}

// The parts of a Section's body by the depth rule: the collections standing
// as its direct children (a fragment is transparent), inside a direct Group,
// or as a direct QueryBoundary's props, whose loading form stands in its
// place while it waits. Anything deeper (inside an app's own component, a
// QueryBoundary's body) is not read.
export function sectionPartsOf(
	children: ReactNode,
	kinds: SectionKinds,
): SectionParts {
	const lists: SectionParts["lists"][number][] = [];
	const waits: boolean[] = [];
	let groups = 0;
	let fields = 0;
	const walk = (node: ReactNode, inGroup: boolean) => {
		for (const child of Children.toArray(node)) {
			if (!isValidElement<{ children?: ReactNode }>(child)) continue;
			const { type, props } = child;
			if (type === Fragment) walk(props.children, inGroup);
			else if (kinds.lists.includes(type)) {
				// A List's or a Table's props carry their items, whatever the item type.
				const { query, items, loading, definition } = props as CollectionProps;
				lists.push({
					query,
					items,
					loading,
					definition: definition !== undefined,
				});
			} else if (kinds.waits.includes(type)) {
				// A BarChart's or a Comparison's props carry their items the same way.
				const { query, loading } = props as CollectionProps;
				waits.push(query?.isPending === true || loading === true);
			} else if (type === kinds.boundary) {
				// A QueryBoundary's props carry its query or its tuple of queries.
				const boundary = props as BoundaryProps;
				const queries =
					"isPending" in boundary.query ? [boundary.query] : boundary.query;
				const pending = queries.some((query) => query.isPending);
				waits.push(pending);
				if (pending) walk(boundary.loading, inGroup);
			} else if (type === kinds.group && !inGroup) {
				groups += 1;
				walk(props.children, true);
			} else if (type === kinds.field) fields += 1;
		}
	};
	walk(children, false);
	return { lists, waits, groups, fields };
}

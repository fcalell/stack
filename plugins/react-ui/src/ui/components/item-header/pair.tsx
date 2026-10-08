import {
	Children,
	cloneElement,
	Fragment,
	isValidElement,
	type ReactNode,
} from "react";
import { ActionBar } from "../action-bar/index.tsx";
import { Thread } from "../thread/index.tsx";
import { ItemHeader, type ItemHeaderProps } from "./index.tsx";

const PAIR = "flex flex-col gap-pair";

// The nodes a body draws in order, a Fragment seen through and each element
// keyed by its place, so the pair and the rest never share a key.
function leaves(node: ReactNode, path = ""): ReactNode[] {
	return Children.toArray(node).flatMap((child, at) => {
		const key = `${path}${at}`;
		if (!isValidElement<{ children?: ReactNode }>(child)) return [child];
		return child.type === Fragment
			? leaves(child.props.children, `${key}.`)
			: [cloneElement(child, { key })];
	});
}

/** A body's children with a leading `ItemHeader` and the sibling after it gathered into one pair column, so the body's sections step stands after the pair. The head pairs with an `ActionBar` directly after it (its act), and, in a Split's main (`inMain`), with whatever follows when it has no facts line (its title over the record's first part), a Thread excepted, which fills the main as its direct child. A head or bar behind a wrapper component is not paired. */
export function headPaired(children: ReactNode, inMain = false): ReactNode {
	const [head, next, ...rest] = leaves(children);
	if (!isValidElement<ItemHeaderProps>(head) || head.type !== ItemHeader)
		return children;
	if (!isValidElement(next)) return children;
	const bare = inMain && !head.props.facts?.length && next.type !== Thread;
	if (next.type !== ActionBar && !bare) return children;
	return (
		<>
			<div key="pair" className={PAIR}>
				{head}
				{next}
			</div>
			{rest}
		</>
	);
}

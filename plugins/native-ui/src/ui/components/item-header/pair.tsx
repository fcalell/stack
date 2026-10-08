import {
	Children,
	cloneElement,
	Fragment,
	isValidElement,
	type ReactNode,
} from "react";
import { View } from "react-native";
import { ActionBar } from "../action-bar";
import { Banner } from "../banner";
import { Thread } from "../thread";
import { ItemHeader, type ItemHeaderProps } from ".";

const PAIR = "gap-pair";

// The nodes a body draws in order, a Fragment seen through and each element
// keyed by its place among the children (an empty slot keeps its number), so
// an element keeps its key, and its state, when a sibling before it comes or
// goes, and the pair and the rest never share a key.
function leaves(node: ReactNode, path = ""): ReactNode[] {
	const drawn: ReactNode[] = [];
	let at = 0;
	Children.forEach(node, (child) => {
		const key = `${path}${at++}`;
		if (!isValidElement<{ children?: ReactNode }>(child)) {
			if (child != null && typeof child !== "boolean") drawn.push(child);
		} else if (child.type === Fragment)
			drawn.push(...leaves(child.props.children, `${key}.`));
		else drawn.push(cloneElement(child, { key }));
	});
	return drawn;
}

// A body's children with a leading `ItemHeader` and the sibling after it
// gathered into one pair column, so the body's sections step stands after the
// pair. The head pairs with an `ActionBar` or a `Banner` directly after it (its
// act, its notice), facts or not, and, in a Split's main (`inMain`), with
// whatever follows when it has no facts line (its title over the record's first
// part), a Thread excepted, which fills the record as its direct child. A head,
// bar or banner behind a wrapper component is not paired.
export function headPaired(children: ReactNode, inMain = false): ReactNode {
	const drawn = leaves(children);
	const [head, next, ...rest] = drawn;
	if (!isValidElement<ItemHeaderProps>(head) || head.type !== ItemHeader)
		return children;
	const apart =
		isValidElement(next) && (next.type === ActionBar || next.type === Banner);
	const bare =
		inMain &&
		isValidElement(next) &&
		!head.props.facts?.length &&
		next.type !== Thread;
	// One keyed list in both forms, so a Thread keeps its place when a Banner joins the head.
	if (!apart && !bare) return <>{drawn}</>;
	return (
		<>
			{[
				<View key="pair" className={PAIR}>
					{head}
					{next}
				</View>,
				...rest,
			]}
		</>
	);
}

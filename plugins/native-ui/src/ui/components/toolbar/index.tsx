import { TOOLBAR, TOOLBAR_CHIPS, TOOLBAR_ROW } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { RecordShown } from "../../lib/frame";
import { Chip } from "../chip";
import { Input } from "../input";

const ROW = "flex-row flex-wrap items-center";
const SEARCH = "w-full";

export interface ToolbarProps extends Closed {
	children?: ReactNode;
}

// The strip under a hairline: the search on a row of its own, the acts at
// their width in a wrapping row under it, the applied filters' chips in a
// row under them. Never a filled act: the create act is the page's. While a
// record stands alone the strip leaves with the list it works on.
export function Toolbar({ children }: ToolbarProps) {
	const behind = useContext(RecordShown);
	const search: ReactNode[] = [];
	const acts: ReactNode[] = [];
	const chips: ReactNode[] = [];
	for (const child of Children.toArray(children)) {
		if (isValidElement(child) && child.type === Input) search.push(child);
		else if (isValidElement(child) && child.type === Chip) chips.push(child);
		else acts.push(child);
	}
	if (behind) return null;
	return (
		<View className={TOOLBAR}>
			<View className={cn(TOOLBAR_ROW, ROW)}>
				{search.length > 0 ? <View className={SEARCH}>{search}</View> : null}
				{acts.length > 0 ? (
					<View className={cn(TOOLBAR_ROW, ROW)}>{acts}</View>
				) : null}
			</View>
			{chips.length > 0 ? (
				<View className={cn(TOOLBAR_CHIPS, ROW)}>{chips}</View>
			) : null}
		</View>
	);
}

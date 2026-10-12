import type { ToolbarChip, ToolbarSearch } from "@fcalell/ui-core/descriptors";
import { TOOLBAR, TOOLBAR_CHIPS, TOOLBAR_ROW } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Chip } from "../chip";
import { Input } from "../input";

const ROW = "flex-row flex-wrap items-center";
const SEARCH = "w-full";

export interface ToolbarProps extends Closed {
	// The search box: its value, what it hears and its hint.
	search?: ToolbarSearch;
	// The applied filters, each a removable `Chip`, in a row under the acts.
	chips?: readonly ToolbarChip[];
	// The acts at the bar fit (a filter's `Button` with its count, an `IconButton`).
	children?: ReactNode;
}

// The strip under a hairline: the search on a row of its own, the acts at
// their width in a wrapping row under it, the applied filters' chips in a
// row under them. Never a filled act: the create act is the page's.
export function Toolbar({ search, chips, children }: ToolbarProps) {
	return (
		<View className={TOOLBAR}>
			<View className={cn(TOOLBAR_ROW, ROW)}>
				{search ? (
					<View className={SEARCH}>
						<Input
							kind="search"
							value={search.value}
							onChange={search.onChange}
							placeholder={search.placeholder}
						/>
					</View>
				) : null}
				{children ? (
					<View className={cn(TOOLBAR_ROW, ROW)}>{children}</View>
				) : null}
			</View>
			{chips && chips.length > 0 ? (
				<View className={cn(TOOLBAR_CHIPS, ROW)}>
					{chips.map((chip) => (
						<Chip
							key={`${chip.family}:${chip.label}`}
							family={chip.family}
							label={chip.label}
							onRemove={chip.onRemove}
						/>
					))}
				</View>
			) : null}
		</View>
	);
}

import type { ReactNode } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { LoadingRows } from "../../lib/loading";

export interface ListProps extends Closed {
	loading?: boolean;
	children?: ReactNode;
}

// Rows on the surface with no box and no hairlines: a feed.
export function List({ loading, children }: ListProps) {
	if (loading) return <LoadingRows />;
	return <View>{children}</View>;
}

import { SKELETON } from "@fcalell/ui-core/variants";
import { cn } from "#lib/cn";

// A neutral placeholder block, sized by its own props (native's names; its
// type there is RN's DimensionValue). The pulse is web-only motion overlay.
type SkeletonProps = {
	width?: number | string;
	height?: number | string;
	class?: never;
	style?: never;
	classList?: never;
};

function dimension(value: number | string | undefined): string | undefined {
	return typeof value === "number" ? `${value}px` : value;
}

function Skeleton(props: SkeletonProps) {
	return (
		<div
			class={cn(SKELETON, "animate-pulse")}
			style={{
				width: dimension(props.width),
				height: dimension(props.height),
			}}
		/>
	);
}

export type { SkeletonProps };
export { Skeleton };

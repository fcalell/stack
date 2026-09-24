import { GROUP, HAIRLINE } from "@fcalell/ui-core/variants";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { LoadingRows } from "#lib/loading.tsx";

// Rows that are a record: a group-filled box with hairlines between rows.
export type GroupProps = Closed & {
	loading?: boolean;
	children?: JSX.Element;
};

export function Group(props: GroupProps) {
	return (
		<div
			class={cn(
				GROUP,
				HAIRLINE,
				"flex flex-col overflow-hidden [&>*+*]:border-t",
			)}
		>
			<Show when={!props.loading} fallback={<LoadingRows inGroup />}>
				{props.children}
			</Show>
		</div>
	);
}

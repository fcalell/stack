import qrcode from "qrcode-generator";
import { createMemo, For, Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { LoadingRows } from "#lib/loading.tsx";

// A square code in ink on the surface; a meta line is the consumer's, beneath.
export type QrCodeProps = Closed & {
	value: string;
	loading?: boolean;
};

const QUIET = 2;

export function QrCode(props: QrCodeProps) {
	const modules = createMemo(() => {
		const code = qrcode(0, "M");
		code.addData(props.value);
		code.make();
		const count = code.getModuleCount();
		const cells: Array<[number, number]> = [];
		for (let y = 0; y < count; y++) {
			for (let x = 0; x < count; x++) {
				if (code.isDark(y, x)) cells.push([x, y]);
			}
		}
		return { count, cells };
	});
	const size = () => modules().count + QUIET * 2;
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<svg
				viewBox={`0 0 ${size()} ${size()}`}
				role="img"
				aria-label={props.value}
				shape-rendering="crispEdges"
				class="aspect-square w-full max-w-64 fill-ink"
			>
				<For each={modules().cells}>
					{([x, y]) => (
						<rect x={x + QUIET} y={y + QUIET} width="1" height="1" />
					)}
				</For>
			</svg>
		</Show>
	);
}

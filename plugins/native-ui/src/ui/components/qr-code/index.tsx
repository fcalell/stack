import { QR_TILE, qrCode } from "@fcalell/ui-core/variants";
import qrcode from "qrcode-generator";
import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { ScopedTheme } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useTokenColor } from "../../lib/theme";

const TILE = "shrink-0 self-start overflow-hidden";
// The quiet zone a scanner needs, in modules, inside the viewBox.
const QUIET = 4;

// The value's code, its text encoded as UTF-8 bytes (the generator's byte
// mode reads one char per byte).
function encode(value: string) {
	const code = qrcode(0, "M");
	code.addData(String.fromCharCode(...new TextEncoder().encode(value)), "Byte");
	code.make();
	return code;
}

// Each row's runs of dark modules as one rectangle each.
function modules(code: ReturnType<typeof qrcode>): string {
	const count = code.getModuleCount();
	let path = "";
	for (let row = 0; row < count; row++) {
		let col = 0;
		while (col < count) {
			if (!code.isDark(row, col)) {
				col++;
				continue;
			}
			const start = col;
			while (col < count && code.isDark(row, col)) col++;
			const run = col - start;
			path += `M${start + QUIET} ${row + QUIET}h${run}v1h-${run}z`;
		}
	}
	return path;
}

export interface QrCodeProps extends Closed {
	// What the code carries (a link, a pairing secret), at most 2,331 bytes as
	// UTF-8 (the largest code at its error correction); also its name.
	value: string;
	// The tile at its size, the code's square a skeleton.
	loading?: boolean;
}

// The code scaled into a square tile inside a hairline, its quiet zone four
// modules wide. The tile is a light scope (uniwind's `ScopedTheme`): its
// modules stay dark on a light ground in both modes, as a scanner needs.
export function QrCode({ value, loading }: QrCodeProps) {
	return (
		<ScopedTheme theme="light">
			<Tile value={value} loading={loading === true} />
		</ScopedTheme>
	);
}

// Inside the scope, so the code's ink resolves to the light mode's. An SVG
// takes its ink as a prop, never a class: `QR_CODE`'s ink by its state.
function Tile({ value, loading }: { value: string; loading: boolean }) {
	const ink = useTokenColor(loading ? "--color-skeleton" : "--color-ink-body");
	const code = encode(value);
	const count = code.getModuleCount();
	const box = `0 0 ${count + QUIET * 2} ${count + QUIET * 2}`;
	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={loading ? undefined : value}
			accessibilityState={{ busy: loading }}
			className={cn(QR_TILE, TILE)}
		>
			<View className={qrCode({ state: loading ? "loading" : "rest" })}>
				<Svg width="100%" height="100%" viewBox={box}>
					{loading ? (
						<Rect x={QUIET} y={QUIET} width={count} height={count} fill={ink} />
					) : (
						<Path fill={ink} d={modules(code)} />
					)}
				</Svg>
			</View>
		</View>
	);
}

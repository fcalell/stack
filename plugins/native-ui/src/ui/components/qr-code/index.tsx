import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { QR_CODE, QR_TILE } from "@fcalell/ui-core/variants";
import qrcode from "qrcode-generator";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ScopedTheme } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { inertProps, paintBox, useShown } from "../../lib/paint";
import { useTokenColor } from "../../lib/theme";

const TILE = "shrink-0 self-start overflow-hidden";
// The quiet zone a scanner needs, in modules, inside the viewBox.
const QUIET = 4;
// A painted tile's module count, a version 2 code's: it encodes nothing.
const PAINTED_MODULES = 25;

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
	/** What the code carries (a link, a pairing secret), at most 2,331 bytes as UTF-8 (the largest code at its error correction); also its name (text; drawn as a code, never as text). A selection paints the tile, which takes no touch, until its read lands. */
	value: Datum<string>;
}

// The code scaled into a square tile inside a hairline, its quiet zone four
// modules wide. The tile is a light scope (uniwind's `ScopedTheme`): its
// modules stay dark on a light ground in both modes, as a scanner needs. A
// value still to land paints the tile, a still square at the code's size.
export function QrCode({ value }: QrCodeProps) {
	return (
		<ScopedTheme theme="light">
			<Tile value={value} />
		</ScopedTheme>
	);
}

// Inside the scope, so the code's ink resolves to the light mode's. An SVG
// takes its ink as a prop, never a class.
function Tile({ value: given }: { value: Datum<string> }) {
	const [named] = useSelections([given]);
	const shown = useShown(named.painted);
	const ink = useTokenColor("--color-ink-body");
	const value = named.painted ? undefined : named.value;
	// The code encodes once per value, and not while the tile is painted.
	const drawn = useMemo(() => {
		if (value === undefined) return undefined;
		const code = encode(value);
		return { count: code.getModuleCount(), path: modules(code) };
	}, [value]);
	const count = drawn?.count ?? PAINTED_MODULES;
	const box = `0 0 ${count + QUIET * 2} ${count + QUIET * 2}`;
	return (
		<View
			accessible={!named.painted}
			accessibilityRole="image"
			accessibilityLabel={value}
			{...inertProps(named.painted)}
			className={cn(QR_TILE, TILE)}
		>
			<View className={cn(QR_CODE, named.painted && paintBox(shown))}>
				<Svg width="100%" height="100%" viewBox={box}>
					{drawn ? <Path fill={ink} d={drawn.path} /> : null}
				</Svg>
			</View>
		</View>
	);
}

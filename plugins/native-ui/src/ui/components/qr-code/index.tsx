import qrcode from "qrcode-generator";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import type { Closed } from "../../lib/closed";
import { LoadingRows } from "../../lib/loading";
import { useTokenColor } from "../../lib/theme";

export interface QrCodeProps extends Closed {
	value: string;
	loading?: boolean;
}

// A square code on the surface; a meta line may sit beneath it.
export function QrCode({ value, loading }: QrCodeProps) {
	const [size, setSize] = useState(0);
	const ink = useTokenColor("--color-ink");
	const surface = useTokenColor("--color-surface");
	if (loading) return <LoadingRows />;
	const code = qrcode(0, "M");
	code.addData(value);
	code.make();
	const modules = code.getModuleCount();
	const cell = size / (modules + 2);
	const cells: Array<[number, number]> = [];
	for (let r = 0; r < modules; r++) {
		for (let c = 0; c < modules; c++) if (code.isDark(r, c)) cells.push([r, c]);
	}
	return (
		<View
			accessibilityLabel={value}
			onLayout={(event) => setSize(event.nativeEvent.layout.width)}
			className="aspect-square w-full self-center overflow-hidden rounded-group"
		>
			<Svg width={size} height={size}>
				<Rect x={0} y={0} width={size} height={size} fill={surface} />
				{cells.map(([r, c]) => (
					<Rect
						key={`${r}:${c}`}
						x={(c + 1) * cell}
						y={(r + 1) * cell}
						width={cell}
						height={cell}
						fill={ink}
					/>
				))}
			</Svg>
		</View>
	);
}

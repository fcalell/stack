import {
	SCRAMBLE_GLYPHS,
	SCRAMBLE_INTERVAL_MS,
	SCRAMBLE_LENGTH,
	SCRAMBLE_STILL,
	type SpinnerKind,
} from "@fcalell/ui-core/tokens";
import { useEffect, useState } from "react";
import {
	AccessibilityInfo,
	ActivityIndicator,
	Text as RNText,
} from "react-native";

// The busy glyph `Spinner` and a busy `Button` draw, in a color resolved from
// their tone: `circle` spins, `scramble` cycles mono glyphs in place and holds
// still under reduced motion.
export function BusyGlyph({
	kind,
	color,
	label,
}: {
	kind?: SpinnerKind;
	color: string | undefined;
	label?: string;
}) {
	if (kind === "scramble") {
		return <Scramble color={color} label={label} />;
	}
	return <ActivityIndicator color={color} accessibilityLabel={label} />;
}

function scrambled(): string {
	let out = "";
	for (let i = 0; i < SCRAMBLE_LENGTH; i++) {
		out += SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
	}
	return out;
}

function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
		const subscription = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			setReduced,
		);
		return () => subscription.remove();
	}, []);
	return reduced;
}

function Scramble({
	color,
	label,
}: {
	color: string | undefined;
	label?: string;
}) {
	const still = useReducedMotion();
	const [glyphs, setGlyphs] = useState(scrambled);
	useEffect(() => {
		if (still) return;
		const timer = setInterval(
			() => setGlyphs(scrambled()),
			SCRAMBLE_INTERVAL_MS,
		);
		return () => clearInterval(timer);
	}, [still]);
	return (
		<RNText
			accessibilityRole="progressbar"
			accessibilityLabel={label}
			className="font-mono"
			style={{ color }}
		>
			{still ? SCRAMBLE_STILL : glyphs}
		</RNText>
	);
}

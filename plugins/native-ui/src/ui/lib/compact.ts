const STEPS = [
	[1e9, "B"],
	[1e6, "M"],
	[1e3, "K"],
] as const;

// A figure in short notation ("55K"): the mantissa in the device's language,
// at most one fraction digit, then K, M or B. A mantissa that rounds to 1,000
// moves up a step, so 999,950 reads "1M".
// TODO: Hermes on iOS lacks `notation: "compact"`; when it ships, use Intl's
// compact notation as the web does.
export function compact(value: number): string {
	const mantissa = new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 1,
	});
	const size = Math.abs(value);
	const step = STEPS.find(
		([step]) => size >= step || Math.round((size / step) * 10_000) >= 10_000,
	);
	return step
		? `${mantissa.format(value / step[0])}${step[1]}`
		: mantissa.format(value);
}

// Writes the tuning page's values into the contract: reads the JSON its
// "Copy values" button (or the phone's dump) gives, `{ "<knob>": number }`,
// checks every key is a `MOTION_KNOBS` name and every value inside its bounds
// and on its step, rewrites those defaults in `src/tokens.ts` and regenerates
// DESIGN.md. Any miss refuses the whole file, naming each.
//
//   pnpm --filter @fcalell/ui-core motion:apply values.json
//   pbpaste | pnpm --filter @fcalell/ui-core motion:apply
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { MOTION_KNOBS, type MotionKnobName } from "../src/tokens.ts";

// The one literal each knob's default is spelled by in `tokens.ts`: what
// stands before it, so only the number changes and the formatting and comments
// stay.
const SITES: Record<MotionKnobName, string> = {
	instant: "DURATION_MS: Record<Duration, number> = \\{[^}]*?\\binstant: ",
	fast: "DURATION_MS: Record<Duration, number> = \\{[^}]*?\\bfast: ",
	base: "DURATION_MS: Record<Duration, number> = \\{[^}]*?\\bbase: ",
	slow: "DURATION_MS: Record<Duration, number> = \\{[^}]*?\\bslow: ",
	loop: "export const LOOP_MS = ",
	pulse: "export const PULSE_MS = ",
	tick: "export const TICK_MS = ",
	press: "export const PRESS_SCALE = ",
	lift: "export const LIFT_SCALE = ",
	fling: "export const FOLLOW_FLING = ",
	reach: "export const FOLLOW_REACH = ",
	waitDelay: "const WAIT_DELAY_MS = ",
	actDelay: "const ACT_DELAY_MS = ",
	waitMin: "const WAIT_MIN_MS = ",
};

// The values a JSON text holds, or every reason it is refused.
export function parseValues(text: string): Map<MotionKnobName, number> {
	const refused: string[] = [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error("not JSON");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
		throw new Error("not an object of knob values");
	const values = new Map<MotionKnobName, number>();
	for (const [name, value] of Object.entries(parsed)) {
		const knob = MOTION_KNOBS.find((each) => each.name === name);
		if (!knob) {
			refused.push(`${name}: not a motion knob`);
		} else if (typeof value !== "number" || !Number.isFinite(value)) {
			refused.push(`${name}: ${JSON.stringify(value)} is not a number`);
		} else if (value < knob.min || value > knob.max) {
			refused.push(`${name}: ${value} is outside ${knob.min} to ${knob.max}`);
		} else if (
			Math.abs(
				(value - knob.min) / knob.step -
					Math.round((value - knob.min) / knob.step),
			) > 1e-6
		) {
			refused.push(`${name}: ${value} is off the step ${knob.step}`);
		} else {
			values.set(knob.name, value);
		}
	}
	if (refused.length) throw new Error(refused.join("\n"));
	return values;
}

// `tokens.ts`'s source with the given defaults in place of its own.
export function applyValues(
	source: string,
	values: ReadonlyMap<MotionKnobName, number>,
): string {
	let next = source;
	for (const [name, value] of values) {
		const site = new RegExp(`(${SITES[name]})[\\d.]+`);
		if (!site.test(next)) throw new Error(`${name}: no default in tokens.ts`);
		next = next.replace(site, (_, before: string) => `${before}${value}`);
	}
	return next;
}

if (import.meta.main) {
	const [file] = process.argv.slice(2);
	let values: Map<MotionKnobName, number>;
	try {
		values = parseValues(readFileSync(file ?? 0, "utf8"));
	} catch (error) {
		console.error(`refused: ${(error as Error).message}`);
		process.exit(1);
	}
	const tokens = new URL("../src/tokens.ts", import.meta.url);
	const source = readFileSync(tokens, "utf8");
	const next = applyValues(source, values);
	if (next === source) {
		console.log("no knob changed");
	} else {
		writeFileSync(tokens, next);
		console.log(`wrote ${[...values.keys()].join(", ")} to src/tokens.ts`);
		execFileSync("pnpm", ["run", "design-md"], {
			cwd: new URL("..", import.meta.url),
			stdio: "inherit",
		});
	}
}

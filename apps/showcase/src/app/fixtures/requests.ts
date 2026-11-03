import type { AppRouter } from "../../../.stack/worker";
import { ago } from "./ago.ts";

type Request = AppRouter["requests"]["list"]["__output"]["data"][number];

// Fifty thousand requests the deploys served, made when first asked for: the
// window over them loads only the pages in view.
export const TOTAL = 50_000;

const PATHS = [
	"/",
	"/pricing",
	"/docs/getting-started",
	"/docs/deploys",
	"/api/projects",
	"/api/deploys",
	"/api/usage",
	"/blog/edge-caching",
	"/login",
	"/assets/app.js",
];
const METHODS = ["GET", "GET", "GET", "POST", "PUT", "DELETE"] as const;
const STATES = ["done", "done", "done", "done", "attention", "failed"] as const;

// A cheap deterministic scatter, so a row is the same whenever it is asked for.
const scatter = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;

let all: Request[] | undefined;
export function requests(): Request[] {
	all ??= Array.from({ length: TOTAL }, (_, index) => {
		const path = PATHS[index % PATHS.length] as string;
		return {
			id: `req-${index}`,
			method: METHODS[Math.floor(scatter(index) * METHODS.length)] ?? "GET",
			path: `${path}${path === "/" ? "" : `/${index % 97}`}`,
			state: STATES[Math.floor(scatter(index + 1) * STATES.length)] ?? "done",
			took: Math.round(8 + scatter(index + 2) * 900),
			at: ago(index % 43_200),
		};
	});
	return all;
}

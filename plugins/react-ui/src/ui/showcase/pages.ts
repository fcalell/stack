// The places the `/layout` app draws, listed here so a tool that cannot load
// the app's components (Storybook's story generator, run by plain node) reads
// the same list the app routes by.

// The places inside the shell, by the `place` the URL names.
export const INSIDE_PLACES = [
	"deploys",
	"projects",
	"usage",
	"domains",
	"logs",
	"assistant",
	"members",
	"settings",
	"home",
] as const;

// The pages outside the shell: the first run, the sign-in and the first
// Connect step, each standing on its own with no sidebar or tab bar.
export const OUTSIDE_PLACES = ["welcome", "sign-in", "connect"] as const;

// How long a fixture query stays pending before it answers.
export const FIXTURE_MS = 900;

// One page a story draws: the URL's `place`, the `screen` pushed over it and
// the `record` open in it.
export interface ShowcasePage {
	name: string;
	place: string;
	screen?: string;
	record?: string;
}

export function showcasePages(): ShowcasePage[] {
	return [
		...[...INSIDE_PLACES, ...OUTSIDE_PLACES].map((place) => ({
			name: place,
			place,
		})),
		{ name: "verify", place: "domains", screen: "verify" },
		{ name: "deploy-d1", place: "deploys", record: "d1" },
	];
}

import type { PlaceSpec, Switcher } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { type ReactNode, use } from "react";
import { Shell } from "../components/shell/index.tsx";
import { Assistant } from "./layout/assistant.tsx";
import { Deploys } from "./layout/deploys.tsx";
import { act, HereContext, readHere, useTo } from "./layout/here.ts";
import { Home } from "./layout/home.tsx";
import { Members } from "./layout/members.tsx";
import { Domains, Logs, Projects, Verify, Welcome } from "./layout/places.tsx";
import { Settings } from "./layout/settings.tsx";
import { Connect, SignIn } from "./layout/sign-in.tsx";
import { Usage } from "./layout/usage.tsx";
import { useView, ViewBar } from "./view.tsx";

// The places the review draws, by the `place` the URL names, and the Screens
// pushed over them, by its `screen`.
const PAGES = {
	home: Home,
	deploys: Deploys,
	projects: Projects,
	logs: Logs,
	domains: Domains,
	usage: Usage,
	assistant: Assistant,
	members: Members,
	settings: Settings,
} as const;
type Page = keyof typeof PAGES;
const SCREENS = { verify: Verify } as const;

// The pages outside the shell, by the `place` the URL names: the first run,
// the sign-in (email, then code) and the first Connect step, each standing
// on its own with no sidebar or tab bar.
const OUTSIDE = {
	welcome: Welcome,
	"sign-in": SignIn,
	connect: Connect,
} as const;
const isOutside = (place: string): place is keyof typeof OUTSIDE =>
	place in OUTSIDE;

const isPage = (place: string): place is Page => place in PAGES;
const isScreen = (screen: string): screen is keyof typeof SCREENS =>
	screen in SCREENS;

// The Screen the URL pushes, else its place.
function pageOf(place: string, screen?: string): () => ReactNode {
	if (screen !== undefined && isScreen(screen)) return SCREENS[screen];
	return isPage(place) ? PAGES[place] : PAGES.deploys;
}

const PLACES: Array<Omit<PlaceSpec, "route"> & { place?: Page }> = [
	{ label: "Activity", icon: "Activity", count: 3 },
	{ label: "Deploys", icon: "Rocket", place: "deploys" },
	{ label: "Projects", icon: "Folder", place: "projects" },
	{ label: "Usage", icon: "ChartColumn", place: "usage" },
	{ label: "Domains", icon: "Globe", place: "domains" },
	{ label: "Logs", icon: "Logs", place: "logs" },
	{ label: "Assistant", icon: "Sparkles", place: "assistant" },
	{ label: "Members", icon: "Users", place: "members" },
	{ label: "Settings", icon: "Settings", place: "settings" },
	{ label: "Home", icon: "House", place: "home" },
];

const SWITCHER: Switcher = {
	label: "Workspaces",
	options: [
		{ value: "acme", label: "Acme", avatar: {} },
		{ value: "globex", label: "Globex", avatar: {} },
		{ value: "initech", label: "Initech", avatar: {} },
	],
	value: "acme",
	onChange: act,
	act: { label: "New workspace", icon: "Plus", onAct: act },
};

// One app, composed as a product composes it: the Shell around the place the
// URL names (`?place=`, a Screen pushed over it by `&screen=`, a record open
// by `&record=`, a query forced by
// `&query=loading|error|missing|empty`), at the URL's mode and density. The
// first run (`?place=welcome`), the sign-in (`?place=sign-in`) and the first
// Connect step (`?place=connect`) stand outside the shell. The view's toggles
// sit under the app, past the viewport.
export function Layout() {
	const [view, change] = useView();
	const here = readHere(view);
	return (
		<HereContext value={here}>
			{isOutside(here.place) ? <Outside place={here.place} /> : <App />}
			<footer className="flex flex-row flex-wrap items-center gap-inside p-page">
				<p className={text({ role: "title" })}>Layout</p>
				<ViewBar view={view} onChange={change} />
			</footer>
		</HereContext>
	);
}

function Outside(props: { place: keyof typeof OUTSIDE }) {
	const Page = OUTSIDE[props.place];
	return <Page />;
}

function App() {
	const { place, screen } = use(HereContext);
	const to = useTo();
	const Page = pageOf(place, screen);
	// Each place at its own route, carrying the view.
	const places: PlaceSpec[] = PLACES.map(({ place: page, ...spec }) => ({
		...spec,
		route: page ? to({ place: page }) : `#${spec.label.toLowerCase()}`,
	}));
	return (
		<Shell places={places} switcher={SWITCHER}>
			<Page />
		</Shell>
	);
}

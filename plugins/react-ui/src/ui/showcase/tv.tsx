import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { useLayoutEffect } from "react";
import { Gate } from "../components/gate/index.tsx";
import { Pane } from "../components/pane/index.tsx";
import { type Row, Section } from "../components/section/index.tsx";
import { Place } from "../components/shell/place.tsx";
import { Stats } from "../components/stats/index.tsx";

const TODAY: readonly StatSpec[] = [
	{ label: "Deployed", value: 14 },
	{ label: "Failed", value: 1 },
	{ label: "Queued", value: 0 },
	{ label: "Rolled back", value: 2 },
];

// A board's own strips: the counts it names, which share the row's width
// in proportion, so a strip of two or one stands as wide as the rows under it.
const NEEDS: readonly StatSpec[] = [
	{ label: "Needs you", value: 32 },
	{ label: "Underway", value: 22 },
];
const URGENT: readonly StatSpec[] = [{ label: "Urgent", value: 3 }];

// A room screen is dark unless the URL asks `?mode=light`.
function useDarkUnlessAsked() {
	useLayoutEffect(() => {
		const light = new URLSearchParams(location.search).get("mode") === "light";
		document.documentElement.classList.toggle("dark", !light);
	}, []);
}

// A screen read from across a room: a room Place whose one column holds the
// strips of counts, a cell each, filling the viewport, dark unless the
// URL asks `?mode=light`. It carries no view toggles, since a television has
// no pointer; the scale follows the window, so a browser at 1280, 1920 and
// 3840 wide draws the sizes of those screens.
export function Tv() {
	useDarkUnlessAsked();
	return (
		<main className="flex flex-col h-screen">
			<Place distance="room">
				<Pane title="Deploys">
					<Stats items={TODAY} />
					<Stats items={NEEDS} />
					<Stats items={URGENT} />
				</Pane>
			</Place>
		</main>
	);
}

const GLYPHS = ["GitBranch", "Server", "Eye"] as const;
const WORK = [
	"Deploy web",
	"Build the worker",
	"Migrate the database",
	"Watch the checkout",
	"Rotate the keys",
	"Publish the docs",
] as const;
const REPOS = ["web", "worker", "billing", "docs"] as const;

// A long board's rows: a glyph, a name over its repo and who raised it, a
// state and its age. Every third row waits and the rest run, so the list
// holds each form of a status's word; every fifth carries a long word and a
// long meta (the status stands whole and the meta takes the room left, cut
// last), and every seventh a status with no words, a dot alone.
const LONG_META = "raised from the nightly migration of the ledger tables";
const BOARD: Row[] = Array.from({ length: 30 }, (_, at): Row => {
	const waiting = at % 3 === 0;
	const asks = at % 5 === 4;
	return {
		key: `work-${at}`,
		leading: { icon: GLYPHS[at % GLYPHS.length] ?? "GitBranch" },
		title: `${WORK[at % WORK.length]} ${at + 1}`,
		meta: asks
			? [REPOS[at % REPOS.length] ?? "web", "Ana Ruiz", LONG_META]
			: [REPOS[at % REPOS.length] ?? "web", "Ana Ruiz"],
		status: asks
			? { tone: "attention", label: "Needs your approval" }
			: at % 7 === 6
				? { tone: "running", label: "" }
				: waiting
					? { tone: "waiting", label: "Waiting for you" }
					: { tone: "running", label: "Running" },
		trailing: { value: `${at + 2} min` },
	};
});

// A board longer than the room: a strip over a list of thirty rows with a
// status, at the room set. The room cannot scroll, so the page shows what
// fits and the rows past it are the edge this draws.
export function TvBoard() {
	useDarkUnlessAsked();
	return (
		<main className="flex flex-col h-screen">
			<Place distance="room">
				<Pane title="Now" back={false} wide>
					<Stats items={NEEDS} />
					<Section items={BOARD} />
				</Pane>
			</Place>
		</main>
	);
}

// The same screen with nothing to show, its server not answering: a Gate in
// the room Place, filling it at the room set, as a TV's signed-out and failed
// pages draw.
export function TvOffline() {
	useDarkUnlessAsked();
	return (
		<Place distance="room">
			<Gate
				title="Acme is not answering"
				description={["This screen reconnects by itself."]}
			/>
		</Place>
	);
}

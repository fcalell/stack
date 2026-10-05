import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { useLayoutEffect } from "react";
import { Place } from "../components/place/index.tsx";
import { Stat } from "../components/stat/index.tsx";
import { Stats } from "../components/stats/index.tsx";

const TODAY: readonly StatSpec[] = [
	{ label: "Deployed", value: 14 },
	{ label: "Failed", value: 1 },
	{ label: "Queued", value: 0 },
	{ label: "Rolled back", value: 2 },
];

// A screen read from across a room: a room Place whose one column holds the
// glance figure and a strip of counts, filling the viewport, dark unless the
// URL asks `?mode=light`. It carries no view toggles, since a television has
// no pointer; the scale follows the window, so a browser at 1280, 1920 and
// 3840 wide draws the sizes of those screens.
export function Tv() {
	useLayoutEffect(() => {
		const light = new URLSearchParams(location.search).get("mode") === "light";
		document.documentElement.classList.toggle("dark", !light);
	}, []);
	return (
		<main className="flex flex-col h-screen">
			<Place title="Deploys" distance="room">
				<Stat label="need you" value={3} />
				<Stats items={TODAY} />
			</Place>
		</main>
	);
}

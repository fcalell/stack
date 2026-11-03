import { combine, useMutation } from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/crates")({
	component: Crates,
});

// The crates of a library. The Pane holds the tracks' read, so each Section
// holds the one read of its own: the first its bands (`groups` a read, a crate
// each, over rows that wait for them), the second the owners its rows name
// (its `items` the join of the tracks and the owners). The first's rows pick an
// owner from the same read, which the sheet says once when it fails.
function Crates() {
	const tracks = orpc.crates.tracks.read();
	const bands = orpc.crates.bands.read();
	const owners = orpc.crates.owners.read();
	const hand = useMutation(orpc.crates.hand.mutationOptions());
	return (
		<Pane title="Crates" read={tracks}>
			<Section
				title="Tracks"
				description="Filed by crate."
				items={tracks.at((rows) =>
					rows.map((track) => ({
						key: track.id,
						title: track.title,
						meta: [track.artist],
						group: track.crate,
						pick: {
							label: `Owner of ${track.title}`,
							options: owners.at((all) => all),
							value: track.owner,
							onChange: (owner: string) =>
								hand.mutateAsync({ id: track.id, owner }),
						},
					})),
				)}
				groups={bands.at((all) => all)}
				empty={{ sentence: "No track in a crate yet." }}
			/>
			<Section
				title="Handed over"
				description="Who each track is with."
				items={combine([tracks, owners], (rows, all) =>
					rows.map((track) => ({
						key: track.id,
						title: track.title,
						meta: [
							all.find((owner) => owner.value === track.owner)?.label ??
								"Nobody",
						],
					})),
				)}
				empty={{ sentence: "No track is handed over." }}
			/>
		</Pane>
	);
}

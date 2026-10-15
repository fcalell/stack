import { DefinitionRowBase } from "../../components/definition-row/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { MeterBase } from "../../components/meter/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Slider } from "../../components/slider/index.tsx";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { endedAt } from "../waiting.ts";
import { STAND_IN_ENTRIES, Wide } from "./layout-context.tsx";
import { Paged } from "./more.tsx";

const noop = () => {};

/** A card of the static parts a Group holds, one per part: a Meter, a Slider and a DefinitionRow of each form (one line, copyable, a setting that opens, a control). Loaded and painted draw the same entries: the Meter and the rows paint, the Slider has no data to wait for. */
export function Static(props: { loading?: boolean }) {
	return (
		<Group
			items={[
				{
					key: "meter",
					item: (
						<MeterBase
							painted={props.loading}
							label="Jobs this window"
							value={62}
							max={100}
							meta="Jobs and watches pause at the reserve"
						/>
					),
				},
				{
					key: "slider",
					item: (
						<Slider
							label="Reserve"
							value={80}
							onChange={noop}
							min={0}
							max={100}
							step={5}
							unit="percent"
						/>
					),
				},
				{
					key: "plan",
					row: (
						<DefinitionRowBase
							painted={props.loading}
							label="Plan"
							value="Business"
						/>
					),
				},
				{
					key: "id",
					row: (
						<DefinitionRowBase
							painted={props.loading}
							label="Workspace ID"
							value="ws_7f3k9q2m4x"
							copyable
						/>
					),
				},
				{
					key: "region",
					row: (
						<DefinitionRowBase
							painted={props.loading}
							label="Region"
							description="Where the workspace runs."
							value="Frankfurt"
							href="#region"
						/>
					),
				},
				{
					key: "notify",
					row: (
						<DefinitionRowBase
							painted={props.loading}
							label="Notify on failure"
							switch={{ checked: true, onChange: noop }}
						/>
					),
				},
			]}
		/>
	);
}

const WORKSPACES = [
	{ id: "w1", name: "Production" },
	{ id: "w2", name: "Staging" },
	{ id: "w3", name: "Previews" },
];

// Every cell draws the Group in the frame's state: rows at rest, loading its
// static parts painted beside the loaded card; the empty and error states its
// list over a read that answers none, fails and answers not found, each in a
// Section that holds no read, so the Group draws its own form; the more state,
// on the first cell, its list over a pages read in each state of its more row.
export function drawGroup(frame: ShowcaseFrame) {
	if (frame.state === "more")
		return isFirstCell(frame) ? (
			<Wide>
				<Paged
					id={frame.id}
					rows={WORKSPACES}
					draw={(workspaces, how) => (
						<Section title={`Workspaces, ${how}`} read={workspaces}>
							<Group
								list={{
									items: workspaces,
									row: { key: (one) => one.id, title: (one) => one.name },
								}}
							/>
						</Section>
					)}
				/>
			</Wide>
		) : undefined;
	if (frame.state === "empty" || frame.state === "error")
		return (
			<Wide>
				{endedAt<(typeof WORKSPACES)[number]>(frame.id, frame.state).map(
					({ title, items }) => (
						<Section key={title} title={title}>
							<Group
								list={{
									items,
									row: { key: (one) => one.id, title: (one) => one.name },
								}}
							/>
						</Section>
					),
				)}
			</Wide>
		);
	if (frame.state === "loading")
		return (
			<Wide>
				<Static />
				<Static loading />
			</Wide>
		);
	return (
		<Wide>
			<Group items={STAND_IN_ENTRIES} />
		</Wide>
	);
}

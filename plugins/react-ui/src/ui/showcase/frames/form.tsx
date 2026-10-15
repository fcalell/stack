import { Field } from "@base-ui/react/field";
import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { text, textStrong } from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useRef } from "react";
import { Form } from "../../components/form/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Switch } from "../../components/switch/index.tsx";
import { Text } from "../../components/text/index.tsx";
import type { Empty } from "../../lib/empty.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { isHeld, readsAt } from "../waiting.ts";

const change = () => {};
const never = () => new Promise<void>(() => {});
const LABEL = cn(text({ role: "body" }), textStrong({ role: "body" }));

// A labelled field, standing in for `FormField`.
export function Labelled(props: {
	label: string;
	value: string;
	description?: string;
}) {
	return (
		<Field.Root className="flex flex-col gap-pair min-w-0">
			<Field.Label className={LABEL}>{props.label}</Field.Label>
			<Input value={props.value} onChange={change} />
			{props.description ? (
				<Field.Description className={text({ role: "meta" })}>
					{props.description}
				</Field.Description>
			) : null}
		</Field.Root>
	);
}

// A setting row inside a Group, standing in for the settings row.
function Setting(props: { label: string; description: string; on: boolean }) {
	return (
		<div className="flex items-center gap-fields min-h-row-setting px-card py-pair">
			<div className="flex grow min-w-0 flex-col">
				<span className={LABEL}>{props.label}</span>
				<span className={text({ role: "meta" })}>{props.description}</span>
			</div>
			<Switch checked={props.on} onChange={change} label={props.label} />
		</div>
	);
}

// A form of two fields and its bar over a read, in whichever form the read
// puts it: waiting (the fields' leaves paint, the filled act with them),
// failed, missing, empty or landed.
function Over(props: {
	read: Selection<unknown>;
	empty?: Empty;
	failed?: string;
}) {
	return (
		<Form
			read={props.read}
			empty={props.empty}
			failed={props.failed}
			bar={{ acts: [{ label: "Save", onAct: never }] }}
		>
			<Labelled label="Project name" value="acme-web" />
			<Labelled label="Region" value="Frankfurt, eu-central-1" />
		</Form>
	);
}

// A form of groups, each its own frame: the first over a read, the second
// always loaded, so one group's wait or failure never stands in the other's.
function Grouped(props: { read: Selection<unknown>; failed?: string }) {
	return (
		<Form
			groups={[
				{
					title: "General",
					read: props.read,
					failed: props.failed,
					fields: <Labelled label="Workspace name" value="Acme Inc" />,
				},
				{
					title: "Region",
					fields: <Labelled label="Region" value="Frankfurt, eu-central-1" />,
				},
			]}
		/>
	);
}

// The loading frame presses its form's submit act once mounted, into an act
// that never settles.
function Submitted(props: { children: ReactNode }) {
	const frame = useRef<HTMLDivElement>(null);
	useEffect(() => {
		frame.current
			?.querySelector<HTMLButtonElement>("button[type=submit]")
			?.click();
	}, []);
	return (
		<div ref={frame} className="flex flex-col">
			{props.children}
		</div>
	);
}

// `FORM.holds.fields` draws a create form, `FORM.holds.sections` a settings
// form of two groups with its bar under the hairline. Loading, the create
// form presses its submit act, and a form over a read and one of groups over
// a read wait beside it, painted.
// Busy, stale and paused draw both over a read that holds rows: the mark after
// the group's legend, the line under it or at the form's top.
export function drawForm(frame: ShowcaseFrame) {
	const { name } = frame.cell;
	if (name !== "FORM.holds.fields" && name !== "FORM.holds.sections")
		return undefined;
	const loading = frame.state === "loading";
	const reads = readsAt(frame.id);
	const other = readsAt(`${frame.id}/2`);
	if (isHeld(frame.state))
		return (
			<div className="flex flex-col gap-sections">
				<Over read={reads[frame.state]} />
				<Grouped read={readsAt(`${frame.id}/3`)[frame.state]} />
			</div>
		);
	if (frame.state === "error")
		return (
			<div className="flex flex-col gap-sections">
				<Over read={reads.failing} />
				<Over read={other.failing} failed="The project did not load." />
				<Over read={reads.missing} />
				<Grouped read={readsAt(`${frame.id}/3`).failing} />
			</div>
		);
	if (frame.state === "empty")
		return (
			<div className="flex flex-col gap-sections">
				<Over
					read={reads.empty}
					empty={{ sentence: "There are no settings to change." }}
				/>
				<Over read={other.empty} />
				<Grouped read={reads.empty.at((rows) => rows)} />
			</div>
		);
	const drawn =
		name === "FORM.holds.fields" ? (
			<div className="flex flex-col gap-fields">
				<Text>
					A project holds one app and its deploys. The form below stands as wide
					as this paragraph, the page's column.
				</Text>
				<Form
					bar={{
						acts: [
							{ label: "Cancel", onAct: change },
							{ label: "Create project", onAct: never },
						],
					}}
				>
					<Labelled
						label="Project name"
						value="acme-web"
						description="Lowercase letters, digits and dashes."
					/>
					<Labelled label="Region" value="Frankfurt, eu-central-1" />
				</Form>
			</div>
		) : (
			<Form
				bar={{
					acts: [
						{ label: "Discard", onAct: change },
						{ label: "Save changes", onAct: never },
					],
				}}
				groups={[
					{
						title: "General",
						description: "How the workspace appears to its members.",
						fields: (
							<>
								<FormField label="Workspace name">
									<Input value="Acme Inc" onChange={change} />
								</FormField>
								<FormField
									label="Workspace URL"
									description="Changing it breaks shared links."
								>
									<Input value="acme-inc" onChange={change} />
								</FormField>
							</>
						),
					},
					{
						title: "Notifications",
						description: "What you hear about.",
						fields: (
							<Group
								items={[
									{
										key: "weekly-summary",
										row: (
											<Setting
												label="Weekly summary"
												description="Every Monday"
												on={false}
											/>
										),
									},
									{
										key: "mentions",
										row: (
											<Setting
												label="Mentions"
												description="When someone mentions you"
												on
											/>
										),
									},
								]}
							/>
						),
					},
				]}
			/>
		);
	if (loading)
		return (
			<div className="flex flex-col gap-sections">
				{name === "FORM.holds.fields" ? <Submitted>{drawn}</Submitted> : drawn}
				<Over read={reads.waiting} />
				<Grouped read={other.waiting} />
			</div>
		);
	return (
		<div className="flex flex-col gap-sections">
			{drawn}
			<Over read={reads.ready.at((rows) => rows)} />
		</div>
	);
}

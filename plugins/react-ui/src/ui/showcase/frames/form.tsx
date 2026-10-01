import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
import { text, textStrong } from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useRef } from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Switch } from "../../components/switch/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

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
// form of two sections with its bar under the hairline. Loading, the create
// form presses its submit act and the settings form's first section waits
// over its fields.
export function drawForm(frame: ShowcaseFrame) {
	const { name } = frame.cell;
	if (name !== "FORM.holds.fields" && name !== "FORM.holds.sections")
		return undefined;
	const loading = frame.state === "loading";
	const drawn =
		name === "FORM.holds.fields" ? (
			<Form>
				<Labelled
					label="Project name"
					value="acme-web"
					description="Lowercase letters, digits and dashes."
				/>
				<Labelled label="Region" value="Frankfurt, eu-central-1" />
				<ActionBar
					acts={[
						{ label: "Cancel", onAct: change },
						{ label: "Create project", onAct: never },
					]}
				/>
			</Form>
		) : (
			<Form>
				<Section
					title="General"
					description="How the workspace appears to its members."
					loading={loading}
				>
					<Labelled label="Workspace name" value="Acme Inc" />
					<Labelled
						label="Workspace URL"
						value="acme-inc"
						description="Changing it breaks shared links."
					/>
				</Section>
				<Section title="Notifications" description="What you hear about.">
					<Group>
						<Setting
							label="Weekly summary"
							description="Every Monday"
							on={false}
						/>
						<Setting
							label="Mentions"
							description="When someone mentions you"
							on
						/>
					</Group>
				</Section>
				<ActionBar
					acts={[
						{ label: "Discard", onAct: change },
						{ label: "Save changes", onAct: never },
					]}
				/>
			</Form>
		);
	return loading && name === "FORM.holds.fields" ? (
		<Submitted>{drawn}</Submitted>
	) : (
		drawn
	);
}

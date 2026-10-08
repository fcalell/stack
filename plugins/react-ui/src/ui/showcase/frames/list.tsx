import { FormField } from "../../components/form-field/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { List } from "../../components/list/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { ago } from "../ago.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { queryOf } from "./layout-context.tsx";
import { Column } from "./place.tsx";

interface Note {
	id: string;
	title: string;
	edited: string;
}

interface Deploy {
	id: string;
	author: string;
	message: string;
	age: string;
}

const NOTES: Note[] = [
	{ id: "n1", title: "Groceries", edited: "Edited yesterday" },
	{ id: "n2", title: "Release checklist", edited: "Edited 3 days ago" },
	{ id: "n3", title: "Interview questions", edited: "Edited last week" },
];

const DEPLOYS: Deploy[] = [
	{
		id: "d1",
		author: "Ana Ruiz",
		message: "Fix invoice rounding",
		age: ago(120),
	},
	{ id: "d2", author: "Ben Kaya", message: "Export cohorts", age: ago(300) },
	{ id: "d3", author: "Ema Okafor", message: "Retry webhooks", age: ago(1440) },
];

interface HostKey {
	id: string;
	algorithm: string;
	fingerprint: string;
}

const HOST_KEYS: HostKey[] = [
	{
		id: "k1",
		algorithm: "ED25519",
		fingerprint: "SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s",
	},
	{
		id: "k2",
		algorithm: "RSA",
		fingerprint: "SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8",
	},
	{
		id: "k3",
		algorithm: "ECDSA",
		fingerprint: "SHA256:p2QAMXNIC1TJYWeIOttrVc98/R1BUFWu3/LiyKgUfQM",
	},
];

const HOSTS = [
	{ id: "h1", name: "docs.example.org" },
	{ id: "h2", name: "api.example.org" },
];

const LIMITS = [
	{ id: "seats", label: "Seats", value: 4, max: 12 },
	{ id: "builds", label: "Build minutes", value: 4000, max: 6000 },
];

const refetch = () => {};

// Rows whose titles are known before their counts: loading, they stand as
// loaded with the counts waiting.
const AREAS = [
	{ id: "a1", name: "Notes", count: 12 },
	{ id: "a2", name: "Deploys", count: 3 },
	{ id: "a3", name: "Hosts", count: 2 },
];

/** A List of known rows with a trailing count, loaded or waiting for the counts. */
export function Areas(props: { loading?: boolean }) {
	return (
		<Section title="Areas">
			<List
				items={AREAS}
				loading={props.loading}
				row={{
					key: (area) => area.id,
					title: (area) => area.name,
					trailing: (area) => ({ count: area.count }),
					href: (area) => `#${area.id}`,
				}}
			/>
		</Section>
	);
}

// Every cell draws five Lists in the frame's state, each in a Section on a
// page as it ships: notes (a title over a meta line, no leading), deploys
// (an avatar leading, an age trailing), each waiting in its own rows' slots,
// its empty and failed forms framed in the Section; host keys, facts
// from data in a Group (a label over its fingerprint, copied), the Section's
// head carrying no count; and allowed hosts, an add field over a List in a
// Group, the field live while the rows wait; and plan limits, meters from data in a Group.
export function drawList(frame: ShowcaseFrame) {
	return (
		<Column>
			<Place title="Library">
				<Section title="Notes">
					<List
						query={queryOf(frame.state, NOTES)}
						sentence="The notes did not load."
						empty={{
							title: "No notes",
							sentence: "Notes you write land here, newest first.",
							act: { label: "New note", onAct: refetch },
						}}
						row={{
							key: (note) => note.id,
							title: (note) => note.title,
							meta: (note) => [note.edited],
							href: (note) => `#${note.id}`,
						}}
					/>
				</Section>
				<Section title="Deploys">
					<List
						query={queryOf(frame.state, DEPLOYS)}
						sentence="The deploys did not load."
						empty={{
							title: "No deploys",
							sentence: "Each deploy of the project lands here.",
							act: { label: "Deploy", onAct: refetch },
						}}
						row={{
							key: (deploy) => deploy.id,
							leading: { avatar: (deploy) => ({ name: deploy.author }) },
							title: (deploy) => deploy.message,
							trailing: (deploy) => ({ age: deploy.age }),
							href: (deploy) => `#${deploy.id}`,
						}}
					/>
				</Section>
				<Section title="Host keys">
					<Group>
						<List
							query={queryOf(frame.state, HOST_KEYS)}
							sentence="The host keys did not load."
							empty={{
								title: "No host keys",
								sentence: "The keys the host presents land here.",
								act: { label: "Scan host", onAct: refetch },
							}}
							definition={{
								key: (key) => key.id,
								label: (key) => key.algorithm,
								value: (key) => key.fingerprint,
								copyable: true,
							}}
						/>
					</Group>
				</Section>
				<Section title="Allowed hosts">
					<Group>
						<FormField label="Add host">
							<Input
								value=""
								onChange={refetch}
								placeholder="docs.example.org"
								act={{ icon: "Plus", label: "Add host", onAct: refetch }}
							/>
						</FormField>
						<List
							query={queryOf(frame.state, HOSTS)}
							sentence="The hosts did not load."
							empty={{
								title: "No hosts",
								sentence: "Hosts you allow land here.",
							}}
							row={{
								key: (host) => host.id,
								title: (host) => host.name,
							}}
						/>
					</Group>
				</Section>
				<Section title="Plan limits">
					<Group>
						<List
							query={queryOf(frame.state, LIMITS)}
							sentence="The limits did not load."
							empty={{
								title: "No limits",
								sentence: "The limits of your plan land here.",
							}}
							meter={{
								key: (limit) => limit.id,
								label: (limit) => limit.label,
								value: (limit) => limit.value,
								max: (limit) => limit.max,
								meta: (limit) => `${limit.value} of ${limit.max}`,
							}}
						/>
					</Group>
				</Section>
				{frame.state === "loading" ? (
					<>
						<Areas />
						<Areas loading />
					</>
				) : null}
			</Place>
		</Column>
	);
}

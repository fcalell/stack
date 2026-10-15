import { FormField } from "../../components/form-field/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { List } from "../../components/list/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { ago } from "../ago.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { itemsAt } from "../waiting.ts";
import { Paged } from "./more.tsx";
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

// A list over a pages read, in each state of its more row.
const MORE_TITLES = {
	next: "Deploys",
	fetching: "Deploys, next page loading",
	failed: "Deploys, next page failed",
};

// Every cell draws five Lists in the frame's state, each in a Section on a
// page as it ships and the Section holding its read: notes (a title over a
// meta line, no leading), deploys (an avatar leading, an age trailing), each
// painting its rows while the read waits, its empty and failed forms framed in
// the Section; host keys, facts from data in a Group (a label over its
// fingerprint, copied); and allowed hosts, an add field over a List in a Group,
// the field live while the rows paint; and plan limits, meters from data in a
// Group. The more state draws the deploys over a pages read in each state of
// its more row, on the list cell.
export function drawList(frame: ShowcaseFrame) {
	if (frame.state === "more")
		return frame.cell.name === "LIST" ? (
			<Column>
				<Place>
					<Pane title="Library">
						<Paged
							id={frame.id}
							rows={DEPLOYS}
							draw={(deploys, how) => (
								<Section title={MORE_TITLES[how]} read={deploys}>
									<List
										items={deploys}
										row={{
											key: (deploy) => deploy.id,
											leading: {
												avatar: (deploy) => ({ name: deploy.author }),
											},
											title: (deploy) => deploy.message,
											trailing: (deploy) => ({ age: deploy.age }),
											href: (deploy) => `#${deploy.id}`,
										}}
									/>
								</Section>
							)}
						/>
					</Pane>
				</Place>
			</Column>
		) : undefined;
	const at = <T,>(name: string, items: readonly T[]) =>
		itemsAt(`${frame.id}/${name}`, frame.state, items);
	const notes = at("notes", NOTES);
	const deploys = at("deploys", DEPLOYS);
	const keys = at("keys", HOST_KEYS);
	const hosts = at("hosts", HOSTS);
	const limits = at("limits", LIMITS);
	return (
		<Column>
			<Place>
				<Pane title="Library">
					<Section
						title="Notes"
						read={notes}
						failed="The notes did not load."
						empty={{
							sentence: "Notes you write land here, newest first.",
							act: { label: "New note", onAct: refetch },
						}}
					>
						<List
							items={notes}
							row={{
								key: (note) => note.id,
								title: (note) => note.title,
								meta: (note) => [note.edited],
								href: (note) => `#${note.id}`,
							}}
						/>
					</Section>
					<Section
						title="Deploys"
						read={deploys}
						failed="The deploys did not load."
						empty={{
							sentence: "Each deploy of the project lands here.",
							act: { label: "Deploy", onAct: refetch },
						}}
					>
						<List
							items={deploys}
							row={{
								key: (deploy) => deploy.id,
								leading: { avatar: (deploy) => ({ name: deploy.author }) },
								title: (deploy) => deploy.message,
								trailing: (deploy) => ({ age: deploy.age }),
								href: (deploy) => `#${deploy.id}`,
							}}
						/>
					</Section>
					<Section
						title="Host keys"
						read={keys}
						failed="The host keys did not load."
						empty={{
							sentence: "The keys the host presents land here.",
							act: { label: "Scan host", onAct: refetch },
						}}
					>
						<Group
							list={{
								items: keys,
								definition: {
									key: (key) => key.id,
									label: (key) => key.algorithm,
									value: (key) => key.fingerprint,
									copyable: true,
								},
							}}
						/>
					</Section>
					<Section
						title="Allowed hosts"
						read={hosts}
						failed="The hosts did not load."
						empty={{
							sentence: "Hosts you allow land here.",
						}}
					>
						<Group
							items={[
								{
									key: "add-host",
									item: (
										<FormField label="Add host">
											<Input
												value=""
												onChange={refetch}
												placeholder="docs.example.org"
												act={{
													icon: "Plus",
													label: "Add host",
													onAct: refetch,
												}}
											/>
										</FormField>
									),
								},
							]}
						/>
						<Group
							list={{
								items: hosts,
								row: {
									key: (host) => host.id,
									title: (host) => host.name,
								},
							}}
						/>
					</Section>
					<Section
						title="Plan limits"
						read={limits}
						failed="The limits did not load."
						empty={{
							sentence: "The limits of your plan land here.",
						}}
					>
						<Group
							list={{
								items: limits,
								meter: {
									key: (limit) => limit.id,
									label: (limit) => limit.label,
									value: (limit) => limit.value,
									max: (limit) => limit.max,
									meta: (limit) => `${limit.value} of ${limit.max}`,
								},
							}}
						/>
					</Section>
				</Pane>
			</Place>
		</Column>
	);
}

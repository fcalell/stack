import { List } from "../../components/list/index.tsx";
import { Place } from "../../components/place/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
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
	{ id: "d1", author: "Ana Ruiz", message: "Fix invoice rounding", age: "2 h" },
	{ id: "d2", author: "Ben Kaya", message: "Export cohorts", age: "5 h" },
	{ id: "d3", author: "Ema Okafor", message: "Retry webhooks", age: "1 d" },
];

const refetch = () => {};

// A query in the frame's state: its items at rest, none when empty.
function queryOf<T>(
	state: ShowcaseFrame["state"],
	items: readonly T[],
): QueryLike<readonly T[]> {
	let data: readonly T[] | undefined;
	if (state === "rest") data = items;
	if (state === "empty") data = [];
	return {
		data,
		isPending: state === "loading",
		isError: state === "error",
		refetch,
	};
}

// Every cell draws two Lists in the frame's state, each in a Section on a
// page as it ships: notes (a title over a meta line, no leading) and
// deploys (an avatar leading, an age trailing), each waiting in its own
// rows' slots, its empty and failed forms framed in the Section.
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
			</Place>
		</Column>
	);
}

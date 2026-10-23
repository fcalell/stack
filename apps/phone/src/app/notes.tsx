import {
	preload as start,
	useMutation,
} from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-native-ui/components/pane";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Sheet } from "@fcalell/plugin-native-ui/components/sheet";
import { age } from "@fcalell/plugin-native-ui/lib/age";
import { confirm } from "@fcalell/plugin-native-ui/lib/confirm";
import type { Act } from "@fcalell/ui-core/descriptors";
import type { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "../lib/api";

// The one read the screen draws, built here so the route's `preload` and the
// screen make the same query.
const notesRead = () => orpc.notes.list.read();

// A press on a link to this route starts the read before the push mounts it.
export const preload = (client: QueryClient) => start(client, notesRead());

export default function Notes() {
	const notes = notesRead();
	const remove = useMutation(orpc.notes.remove.mutationOptions());
	const [open, setOpen] = useState(false);
	const newNote: Act = { label: "New note", onAct: () => setOpen(true) };
	const ask = (note: { id: string; title: string }) =>
		confirm({
			title: "Delete note",
			sentence: `“${note.title}” will be gone for good.`,
			act: {
				label: "Delete",
				destructive: true,
				onAct: () => remove.mutateAsync({ id: note.id }),
			},
		});
	return (
		<Pane
			title="Notes"
			actions={[{ icon: "Plus", label: newNote.label, onAct: newNote.onAct }]}
		>
			<Section
				title="Recent"
				items={notes.at((rows) =>
					rows.map((note) => ({
						key: note.id,
						title: note.title,
						meta: [age(note.createdAt.toISOString())],
						more: [
							{
								label: "Delete",
								icon: "Trash2",
								destructive: true,
								onAct: () => ask(note),
							},
						],
					})),
				)}
				empty={{ sentence: "No notes yet." }}
			/>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="New note"
				form={{
					act: orpc.notes.create,
					fields: { title: { label: "Title" } },
					submit: { label: "Add" },
					onDone: () => setOpen(false),
				}}
			/>
		</Pane>
	);
}

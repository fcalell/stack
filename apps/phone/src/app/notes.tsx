import { useMutation, useQuery } from "@fcalell/plugin-api/tanstack-query";
import { FormField } from "@fcalell/plugin-native-ui/components/form-field";
import { Input } from "@fcalell/plugin-native-ui/components/input";
import { List } from "@fcalell/plugin-native-ui/components/list";
import { Pane } from "@fcalell/plugin-native-ui/components/pane";
import { Place } from "@fcalell/plugin-native-ui/components/place";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Sheet } from "@fcalell/plugin-native-ui/components/sheet";
import { age } from "@fcalell/plugin-native-ui/lib/age";
import { confirm } from "@fcalell/plugin-native-ui/lib/confirm";
import { toast } from "@fcalell/plugin-native-ui/lib/toast";
import type { Act } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { orpc } from "../lib/api";

export default function Notes() {
	const notes = useQuery(orpc.notes.list.queryOptions());
	const create = useMutation(orpc.notes.create.mutationOptions());
	const remove = useMutation(orpc.notes.remove.mutationOptions());
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const start = () => {
		setTitle("");
		setOpen(true);
	};
	const newNote: Act = { label: "New note", onAct: start };
	const add: Act = {
		label: "Add",
		blocked: title.trim() ? undefined : "Give the note a title.",
		loading: create.isPending,
		onAct: () =>
			create.mutateAsync({ title }).then(
				() => setOpen(false),
				() => toast("The note was not added.", { state: "failed" }),
			),
	};
	const ask = (note: { id: string; title: string }) =>
		confirm({
			title: "Delete note",
			sentence: `“${note.title}” will be gone for good.`,
			act: {
				label: "Delete",
				destructive: true,
				onAct: () =>
					remove.mutateAsync({ id: note.id }).catch((error: unknown) => {
						toast("The note was not deleted.", { state: "failed" });
						throw error;
					}),
			},
		});
	return (
		<Place>
			<Pane
				title="Notes"
				actions={[{ icon: "Plus", label: newNote.label, onAct: newNote.onAct }]}
			>
				<Section
					title="Recent"
					count={notes.data?.length}
					loading={notes.isPending}
				>
					<List
						query={notes}
						sentence="Notes did not load."
						empty={{ sentence: "No notes yet." }}
						row={{
							key: (note) => note.id,
							title: (note) => note.title,
							meta: (note) => [age(note.createdAt.toISOString())],
							more: (note) => [
								{
									label: "Delete",
									icon: "Trash2",
									destructive: true,
									onAct: () => ask(note),
								},
							],
						}}
					/>
				</Section>
				<Sheet
					open={open}
					onClose={() => setOpen(false)}
					title="New note"
					submit={add}
				>
					<FormField label="Title">
						<Input value={title} onChange={setTitle} />
					</FormField>
				</Sheet>
			</Pane>
		</Place>
	);
}

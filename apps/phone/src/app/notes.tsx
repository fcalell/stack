import { useMutation, useQuery } from "@fcalell/plugin-api/tanstack-query";
import { FormField } from "@fcalell/plugin-native-ui/components/form-field";
import { Input } from "@fcalell/plugin-native-ui/components/input";
import { List } from "@fcalell/plugin-native-ui/components/list";
import { Place } from "@fcalell/plugin-native-ui/components/place";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Sheet } from "@fcalell/plugin-native-ui/components/sheet";
import { age } from "@fcalell/plugin-native-ui/lib/age";
import { toast } from "@fcalell/plugin-native-ui/lib/toast";
import type { Act } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { orpc } from "../lib/api";

export default function Notes() {
	const notes = useQuery(orpc.notes.list.queryOptions());
	const create = useMutation(orpc.notes.create.mutationOptions());
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const start = () => {
		setTitle("");
		setOpen(true);
	};
	const newNote: Act = { label: "New note", onAct: start };
	const add: Act = {
		label: "Add",
		loading: create.isPending,
		onAct: () =>
			create.mutateAsync({ title }).then(
				() => setOpen(false),
				() => toast("The note was not added.", { state: "failed" }),
			),
	};
	return (
		<Place title="Notes" act={newNote}>
			<Section title="Recent">
				<List
					query={notes}
					sentence="Notes did not load."
					empty={{ sentence: "No notes yet.", act: newNote }}
					row={{
						key: (note) => note.id,
						title: (note) => note.title,
						meta: (note) => [age(note.createdAt.toISOString())],
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
		</Place>
	);
}

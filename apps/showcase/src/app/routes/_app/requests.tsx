import { useMutation } from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import type { Picked, TableColumn } from "@fcalell/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/requests")({
	component: Requests,
});

type Request = AppRouter["requests"]["list"]["__output"]["data"][number];
type Query = { q?: string | undefined };

// A column's key is the name the procedure sorts it by.
const COLUMNS: TableColumn<Request>[] = [
	{
		key: "path",
		label: "Path",
		width: "1/4",
		sortable: true,
		cell: (request) => `${request.method} ${request.path}`,
	},
	{
		key: "state",
		label: "Outcome",
		kind: "status",
		width: "measure-short",
		cell: (request) => ({ tone: request.state }),
	},
	{
		key: "took",
		label: "Took (ms)",
		kind: "number",
		width: "measure-short",
		sortable: true,
		cell: (request) => request.took,
	},
	{
		key: "at",
		label: "Served",
		kind: "age",
		width: "measure-short",
		sortable: true,
		cell: (request) => request.at,
	},
];

const ROW = { id: (request: Request) => request.id };

// Every request the deploys served, windowed: the table is as long as the
// total, loads the pages the scrollbar lands on, and sorts by the server. The
// head tick chooses the search's whole result, and the delete takes that
// choice as it stands.
function Requests() {
	const [q, setQ] = useState("");
	const [picked, setPicked] = useState<Picked<Query>>({ ids: [] });
	const remove = useMutation(orpc.requests.remove.mutationOptions());
	const requests = orpc.requests.list.window(q ? { q } : {});
	return (
		<Pane title="Requests" wide>
			<Toolbar search={{ value: q, onChange: setQ }} />
			<Table
				columns={COLUMNS}
				items={requests}
				row={ROW}
				choose={{ picked, onPick: setPicked, noun: "requests" }}
				select={{
					acts: [
						{
							label: "Delete",
							destructive: true,
							blocked:
								"ids" in picked && picked.ids.length === 0
									? "Choose requests to delete."
									: undefined,
							confirm: {
								title: "Delete the chosen requests?",
								sentence: "Their logs go with them.",
							},
							onAct: () => remove.mutateAsync({ requests: picked }),
							done: "Requests deleted",
						},
					],
				}}
			/>
		</Pane>
	);
}

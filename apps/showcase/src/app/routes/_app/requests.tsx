import { useMutation, useWindow } from "@fcalell/plugin-api/tanstack-query";
import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
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

// A column's key is the name the procedure sorts it by. The method and the id
// start hidden: the columns menu over the grid shows them, and the table keeps
// what the viewer chose. The figure columns (took, served) stand narrow.
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
		sortable: true,
		cell: (request) => request.took,
	},
	{
		key: "at",
		label: "Served",
		kind: "age",
		sortable: true,
		cell: (request) => request.at,
	},
	{
		key: "method",
		label: "Method",
		hidden: true,
		cell: (request) => request.method,
	},
	{
		key: "id",
		label: "Request",
		kind: "source",
		hidden: true,
		cell: (request) => request.id,
	},
];

const ROW = { id: (request: Request) => request.id };

// Every request the deploys served, windowed: the table is as long as the
// total, loads the pages the scrollbar lands on, and sorts by the server. The
// head tick chooses the search's whole result, and the delete takes that
// choice as it stands. The keyboard drives it: the arrows, PageUp and PageDown
// move the active row, Space or x ticks it, Shift with an arrow ticks the rows
// it crosses.
function Requests() {
	const [q, setQ] = useState("");
	const [picked, setPicked] = useState<Picked<Query>>({ ids: [] });
	const remove = useMutation(orpc.requests.remove.mutationOptions());
	const requests = orpc.requests.list.window(q ? { q } : {});
	// The count the foot's selection bar says: the ids ticked, or the query's
	// rows less those unticked, out of every row the filter matches.
	const total = useWindow(requests)?.total ?? 0;
	const count =
		"ids" in picked
			? picked.ids.length
			: Math.max(0, total - picked.except.length);
	const query: Query = q ? { q } : {};
	return (
		<Pane
			title="Requests"
			wide
			foot={
				<ActionBar
					chosen={{
						count,
						of: total,
						noun: "requests",
						onAll: (all) =>
							setPicked(all ? { query, except: [] } : { ids: [] }),
					}}
					acts={[
						{
							label: "Delete",
							destructive: true,
							blocked: count === 0 ? "Choose requests to delete." : undefined,
							confirm: {
								title: "Delete the chosen requests?",
								sentence: "Their logs go with them.",
							},
							onAct: () => remove.mutateAsync({ requests: picked }),
							done: "Requests deleted",
						},
					]}
				/>
			}
		>
			<Toolbar search={{ value: q, onChange: setQ }} />
			<Table
				columns={COLUMNS}
				items={requests}
				row={ROW}
				choose={{ picked, onPick: setPicked }}
			/>
		</Pane>
	);
}

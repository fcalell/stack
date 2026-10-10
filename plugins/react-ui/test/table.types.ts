import type { TableColumn } from "@fcalell/ui-core/descriptors";
import type { TableProps } from "../src/ui/components/table/index.tsx";

interface Member {
	id: string;
	name: string;
	owner: boolean;
}

const columns: TableColumn<Member>[] = [
	{ key: "name", label: "Name", cell: (member) => member.name },
	{
		key: "owner",
		label: "Owner",
		kind: "check",
		cell: (member) => member.owner,
	},
];
const row = { id: (member: Member) => member.id };
const query = {
	data: undefined,
	isPending: false,
	isError: true,
	refetch: () => {},
};

// a Table takes `query` with `sentence`, or `items`, and a `row` map
{
	const fromQuery: TableProps<Member> = {
		columns,
		query,
		sentence: "Members did not load.",
		row,
	};
	const fromItems: TableProps<Member> = { columns, items: [], row };
	void [fromQuery, fromItems];
	// @ts-expect-error: a query names what failed to load
	const unsaid: TableProps<Member> = { columns, query, row };
	// @ts-expect-error: rows of built records are gone
	const built: TableProps<Member> = { columns, rows: [], row };
	// @ts-expect-error: a table takes one data form
	const both: TableProps<Member> = { columns, query, items: [], row };
	void [unsaid, built, both];
}

// a column reads its cell from the item by `cell`
{
	// @ts-expect-error: a column without `cell` draws nothing
	const blind: TableColumn<Member> = { key: "name", label: "Name" };
	const stranger: TableColumn<Member> = {
		key: "n",
		label: "N",
		// @ts-expect-error: a cell is read from the table's item
		cell: (n: number) => n,
	};
	void [blind, stranger];
}

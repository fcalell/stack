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

// a Table takes `items`, constants or a selection, and a `row` map
{
	const fromItems: TableProps<Member> = { columns, items: [], row };
	void fromItems;
	// @ts-expect-error: the rows are items, never a query
	const queried: TableProps<Member> = { columns, query: {}, row };
	// @ts-expect-error: the frame draws the empty form, never the table
	const empty: TableProps<Member> = { columns, items: [], row, empty: {} };
	// @ts-expect-error: rows of built records are gone
	const built: TableProps<Member> = { columns, rows: [], row };
	void [queried, empty, built];
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

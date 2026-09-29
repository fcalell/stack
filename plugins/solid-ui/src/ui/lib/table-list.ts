import type {
	Option,
	StatusCell,
	TableCell,
	TableColumn,
	TableRow,
} from "@fcalell/ui-core/descriptors";

// A phone has no room for a grid, so under tablet a `Table` is a list of
// `ListRow`s drawn from the same columns, as it is on native: the first
// column the title, the first `status` the leading glyph, the first `age`
// the trailing age, every other value a part of the meta line, in column
// order. A tap opens the row and its cells edit in the pane it opens.
export interface ListedRow {
	title: string;
	leading?: { status: StatusCell["status"] };
	meta?: string[];
	trailing?: { age: string };
}

function optionsOf(column: TableColumn): readonly Option<string | null>[] {
	if (column.edit?.control !== "picker") return [];
	return column.edit.options.flatMap((entry) =>
		"options" in entry ? entry.options : [entry],
	);
}

// What a cell reads as in the meta line: a ticked cell its column's label,
// an unticked or empty one nothing, a picked value its option's label.
function part(column: TableColumn, cell: TableCell): string {
	if (cell === null || cell === undefined || cell === false) return "";
	if (cell === true) return column.label;
	if (typeof cell === "object") return cell.label ?? "";
	if (column.edit?.control === "picker")
		return (
			optionsOf(column).find((option) => option.value === cell)?.label ??
			String(cell)
		);
	return String(cell);
}

export function listedRow(columns: TableColumn[], row: TableRow): ListedRow {
	const [first, ...rest] = columns;
	const status = columns.find((column) => column.kind === "status");
	const age = columns.find((column) => column.kind === "age");
	const cell = (column: TableColumn) => row.cells[column.key] ?? null;
	const state = status ? (cell(status) as StatusCell | null) : null;
	const moment = age ? cell(age) : null;
	const meta = rest
		.filter((column) => column !== status && column !== age)
		.map((column) => part(column, cell(column)))
		.filter((each) => each !== "");
	return {
		title: first ? part(first, cell(first)) : row.id,
		leading: state ? { status: state.status } : undefined,
		meta: meta.length > 0 ? meta : undefined,
		trailing: typeof moment === "string" ? { age: moment } : undefined,
	};
}

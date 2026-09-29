import type {
	CellValue,
	Option,
	Part,
	StatusCell,
	TableCell,
	TableColumn,
	TableRow,
} from "@fcalell/ui-core/descriptors";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed";
import { List } from "../list";
import { ListRow } from "../list-row";

export interface TableProps extends Closed {
	columns: TableColumn[];
	rows: TableRow[];
	selected?: string;
	onOpen?: (id: string) => void;
	onEdit?: (id: string, key: string, value: CellValue) => void;
	empty?: ReactNode;
	loading?: boolean;
}

// The options a picked column draws its values' labels from.
function optionsOf(column: TableColumn): readonly Option<string | null>[] {
	if (column.edit?.control !== "picker") return [];
	return column.edit.options.flatMap((entry) =>
		"options" in entry ? entry.options : [entry],
	);
}

// What a cell reads as in a row's meta line; a ticked cell reads as its
// column's label, an unticked or empty one as nothing.
function shown(column: TableColumn, cell: TableCell): string {
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

// The phone has no room for a grid: each row is a `ListRow` drawn from the
// same columns, the first column its title, the first status its leading
// glyph, the first age its trailing age, every other value a part of its
// meta line, in column order. A tap opens the row; its cells edit in the
// pane it opens, since a phone never shows the pane beside the list, which
// is also why the open row draws no selection here.
export function Table({ columns, rows, onOpen, empty, loading }: TableProps) {
	if (loading) return <List loading />;
	if (rows.length === 0) return <>{empty}</>;
	const [first, ...rest] = columns;
	const status = columns.find((column) => column.kind === "status");
	const age = columns.find((column) => column.kind === "age");
	return (
		<List>
			{rows.map((row) => {
				const cell = (column: TableColumn) => row.cells[column.key] ?? null;
				const state = status ? (cell(status) as StatusCell | null) : null;
				const moment = age ? cell(age) : null;
				const meta: Part[] = rest
					.filter((column) => column !== status && column !== age)
					.map((column) => shown(column, cell(column)))
					.filter((part) => part !== "");
				return (
					<ListRow
						key={row.id}
						title={first ? shown(first, cell(first)) : row.id}
						leading={state ? { status: state.status } : undefined}
						meta={meta.length > 0 ? meta : undefined}
						trailing={typeof moment === "string" ? { age: moment } : undefined}
						onOpen={onOpen ? () => onOpen(row.id) : undefined}
					/>
				);
			})}
		</List>
	);
}

import type { ColumnDef, RowData } from "@tanstack/solid-table";
import {
	createSolidTable,
	flexRender,
	getCoreRowModel,
} from "@tanstack/solid-table";
import type { JSX } from "solid-js";
import { For, Show } from "solid-js";
import { Table } from "#components/table";

declare module "@tanstack/solid-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		ariaSort?: () => "ascending" | "descending" | "none";
	}
}

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	fallback?: JSX.Element;
	caption?: string;
	class?: never;
	style?: never;
	classList?: never;
}

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
	const table = createSolidTable({
		get data() {
			return props.data;
		},
		get columns() {
			return props.columns;
		},
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<Table bordered>
			<Show when={props.caption}>
				<Table.Caption>{props.caption}</Table.Caption>
			</Show>
			<Table.Header>
				<For each={table.getHeaderGroups()}>
					{(headerGroup) => (
						<Table.Row>
							<For each={headerGroup.headers}>
								{(header) => (
									<Table.Head
										colSpan={header.colSpan}
										aria-sort={header.column.columnDef.meta?.ariaSort?.()}
									>
										<Show when={!header.isPlaceholder}>
											{flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
										</Show>
									</Table.Head>
								)}
							</For>
						</Table.Row>
					)}
				</For>
			</Table.Header>
			<Table.Body>
				<Show
					when={table.getRowModel().rows?.length}
					fallback={
						<Table.Row>
							<Table.Cell colSpan={props.columns.length}>
								{/* The cell stays closed; the empty-state geometry rides an
								    inner layout element instead of a class hand-off. */}
								<div class="flex h-24 items-center justify-center">
									{props.fallback ?? "No results."}
								</div>
							</Table.Cell>
						</Table.Row>
					}
				>
					<For each={table.getRowModel().rows}>
						{(row) => (
							<Table.Row
								data-state={row.getIsSelected() ? "selected" : undefined}
							>
								<For each={row.getVisibleCells()}>
									{(cell) => (
										<Table.Cell>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</Table.Cell>
									)}
								</For>
							</Table.Row>
						)}
					</For>
				</Show>
			</Table.Body>
		</Table>
	);
}

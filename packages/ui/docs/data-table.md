# DataTable

Data-driven table powered by TanStack Table. Pass columns and data, get sorting, selection, and empty states automatically.

```tsx
import { DataTable } from "@fcalell/ui/components/data-table";
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `ColumnDef<TData, TValue>[]` | TanStack Table column definitions |
| `data` | `TData[]` | Array of row data |
| `fallback` | `JSX.Element` | Custom empty state (default: "No results.") |
| `caption` | `string` | Optional table caption |

## Column meta

Extends TanStack Table's `ColumnMeta` with:

| Field | Type | Description |
|-------|------|-------------|
| `class` | `string` | Applied to both `<th>` and `<td>` |
| `ariaSort` | `() => "ascending" \| "descending" \| "none"` | Dynamic sort indicator |

## Basic usage

```tsx
import type { ColumnDef } from "@tanstack/solid-table";

type Project = { name: string; status: string };

const columns: ColumnDef<Project>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

<DataTable columns={columns} data={projects()} />
```

## Custom empty state

```tsx
<DataTable
  columns={columns}
  data={[]}
  fallback={<EmptyState title="No projects" />}
/>
```

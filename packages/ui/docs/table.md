# Table

Semantic HTML table with consistent styling. Wraps in a scrollable container. Use for static tabular data; for dynamic data see DataTable.

```tsx
import { Table } from "@fcalell/ui/components/table";
```

## Sub-components

### Table (Root)

Scrollable container + `<table>`. Full width, bottom-aligned captions.

| Prop | Type | Description |
|------|------|-------------|
| `containerClass` | `string` | Classes on the outer scroll wrapper |
| `class` | `string` | Classes on the `<table>` element |

### Table.Header

`<thead>` — bottom border on rows.

### Table.Body

`<tbody>` — no border on last row.

### Table.Footer

`<tfoot>` — top border, muted background.

### Table.Row

`<tr>` — bottom border, hover highlight, selected state via `data-state="selected"`.

### Table.Head

`<th>` — left-aligned, muted foreground, medium weight.

### Table.Cell

`<td>` — standard padding, middle-aligned.

### Table.Caption

`<caption>` — muted text below the table.

## Basic usage

```tsx
<Table>
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
      <Table.Head>Status</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Project Alpha</Table.Cell>
      <Table.Cell>Active</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

import type { EitherValue, Option, Rule } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { Rules } from "../../components/rules/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const FIELDS: Option[] = [
	{ value: "page.type", label: "Page type" },
	{ value: "page.url", label: "Page URL" },
	{ value: "visitor.id", label: "Visitor ID" },
	{ value: "order.total", label: "Order total" },
	{ value: "order.currency", label: "Order currency" },
];
const VARIABLES: Option[] = [
	{ value: "pageType", label: "pageType" },
	{ value: "pageUrl", label: "pageUrl" },
	{ value: "userId", label: "userId" },
	{ value: "value", label: "value" },
	{ value: "currency", label: "currency" },
];
const PAGE_TYPES: Option[] = [
	{ value: "home", label: "Home" },
	{ value: "listing", label: "Listing" },
	{ value: "product", label: "Product" },
	{ value: "cart", label: "Cart" },
	{ value: "checkout", label: "Checkout" },
	{ value: "confirmation", label: "Confirmation" },
	{ value: "account", label: "Account" },
];

interface Mapping {
	id: string;
	from: EitherValue;
	to: string | undefined;
}

// A parameter's source is a field by default or a typed constant; `unpaired`
// leaves the last row with neither side set, its arrow faded.
function mappings(unpaired: boolean): Mapping[] {
	return [
		{ id: "a", from: { picked: "page.type" }, to: "pageType" },
		{ id: "b", from: { typed: "EUR" }, to: "currency" },
		{ id: "c", from: { picked: "order.total" }, to: "value" },
		...(unpaired ? [{ id: "d", from: {}, to: undefined }] : []),
	];
}

function MappingRules(props: { unpaired: boolean }) {
	const [rows, setRows] = useState(() => mappings(props.unpaired));
	const edit = (id: string, change: Partial<Mapping>) =>
		setRows((all) =>
			all.map((row) => (row.id === id ? { ...row, ...change } : row)),
		);
	const rules: Rule[] = rows.map((row) => ({
		id: row.id,
		terms: {
			from: {
				either: {
					label: "Source",
					options: FIELDS,
					value: row.from,
					onChange: (from) => edit(row.id, { from }),
					placeholder: "Type a value",
				},
			},
			to: {
				pick: {
					label: "Variable",
					options: VARIABLES,
					value: row.to,
					onChange: (to) => edit(row.id, { to }),
				},
			},
		},
		onRemove: () => setRows((all) => all.filter((one) => one.id !== row.id)),
	}));
	return (
		<Rules
			rules={rules}
			add={{
				label: "Add mapping",
				onAct: () =>
					setRows((all) => [
						...all,
						{ id: `n${all.length}`, from: {}, to: undefined },
					]),
			}}
		/>
	);
}

interface Condition {
	id: string;
	field: string;
	operator: string;
	values: string[];
}

function FilterRules() {
	const [rows, setRows] = useState<Condition[]>([
		{
			id: "a",
			field: "page.type",
			operator: "in",
			values: ["checkout", "cart"],
		},
		{ id: "b", field: "order.currency", operator: "is", values: ["eur"] },
	]);
	const edit = (id: string, change: Partial<Condition>) =>
		setRows((all) =>
			all.map((row) => (row.id === id ? { ...row, ...change } : row)),
		);
	const rules: Rule[] = rows.map((row) => ({
		id: row.id,
		terms: {
			field: {
				label: "Field",
				options: FIELDS,
				value: row.field,
				onChange: (field) => edit(row.id, { field }),
			},
			operator: row.operator,
			value: {
				picks: {
					label: "Values",
					options: row.field === "page.type" ? PAGE_TYPES : CURRENCIES,
					value: row.values,
					onChange: (values) => edit(row.id, { values }),
				},
			},
		},
		onRemove: () => setRows((all) => all.filter((one) => one.id !== row.id)),
	}));
	return (
		<Rules
			rules={rules}
			add={{
				label: "Add condition",
				onAct: () =>
					setRows((all) => [
						...all,
						{
							id: `n${all.length}`,
							field: "page.type",
							operator: "in",
							values: [],
						},
					]),
			}}
		/>
	);
}

const CURRENCIES: Option[] = [
	{ value: "eur", label: "EUR" },
	{ value: "usd", label: "USD" },
	{ value: "gbp", label: "GBP" },
];

// `RULE_ARROW.state.set` draws a mapping with every row paired and
// `unset` one with a row whose sides are both empty, its arrow faded; both
// draw the filter (a condition per row, the values as chips).
export function drawRules(frame: ShowcaseFrame) {
	return (
		<Wide>
			<Section title="Mapping">
				<MappingRules unpaired={frame.cell.name.endsWith(".unset")} />
			</Section>
			<Section title="Filter">
				<FilterRules />
			</Section>
		</Wide>
	);
}

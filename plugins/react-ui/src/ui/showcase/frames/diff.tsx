import type { Hunk } from "@fcalell/ui-core/descriptors";
import { Diff } from "../../components/diff/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

// Board 51's invoice.ts: two hunks, a long added line that wraps.
const INVOICE: Hunk[] = [
	{
		header: "@@ -12,7 +12,9 @@ export function total(invoice: Invoice)",
		lines: [
			{
				kind: "context",
				text: "  const lines = invoice.lines.filter((line) => !line.void);",
				before: 12,
				after: 12,
			},
			{ kind: "context", text: "  let sum = 0;", before: 13, after: 13 },
			{
				kind: "removed",
				text: "  for (const line of lines) sum += line.amount;",
				before: 14,
			},
			{ kind: "added", text: "  for (const line of lines) {", after: 14 },
			{
				kind: "added",
				text: "    sum += Math.round(line.amount * line.quantity * 100) / 100; // cents, not floats",
				after: 15,
			},
			{ kind: "added", text: "  }", after: 16 },
			{
				kind: "context",
				text: "  const tax = sum * invoice.taxRate;",
				before: 15,
				after: 17,
			},
			{
				kind: "context",
				text: "  return { sum, tax, total: sum + tax };",
				before: 16,
				after: 18,
			},
			{ kind: "context", text: "}", before: 17, after: 19 },
		],
	},
	{
		header: "@@ -41,6 +43,6 @@ export function due(invoice: Invoice)",
		lines: [
			{
				kind: "context",
				text: "  const issued = new Date(invoice.issuedAt);",
				before: 41,
				after: 43,
			},
			{
				kind: "removed",
				text: "  issued.setDate(issued.getDate() + 30);",
				before: 42,
			},
			{
				kind: "added",
				text: "  issued.setDate(issued.getDate() + invoice.terms.days);",
				after: 44,
			},
			{ kind: "context", text: "  return issued;", before: 43, after: 45 },
			{ kind: "context", text: "}", before: 44, after: 46 },
		],
	},
];

// Board 51's terms.ts, a new file, diffed from its two texts.
const TERMS = `export interface Terms {
  days: number;
  label: string;
}

export const NET_30: Terms = { days: 30, label: "Net 30" };
export const NET_60: Terms = { days: 60, label: "Net 60" };
`;

// The added cell draws the new file; every other rest cell the invoice.
export function drawDiff(frame: ShowcaseFrame) {
	if (frame.state === "loading")
		return (
			<Wide>
				<Diff label="src/billing/invoice.ts" hunks={[]} loading />
			</Wide>
		);
	return (
		<Wide>
			{frame.cell.name === "DIFF_LINE.kind.added" ? (
				<Diff label="src/billing/terms.ts" before="" after={TERMS} />
			) : (
				<Diff label="src/billing/invoice.ts" hunks={INVOICE} />
			)}
		</Wide>
	);
}

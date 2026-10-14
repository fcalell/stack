import type { ChipMark } from "@fcalell/ui-core/descriptors";
import { FileRowBase } from "../../components/file-row/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { type FileSlots, List } from "../../components/list/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

const LONG = "docs/billing/payment-terms-and-late-invoices.md";

interface File {
	path: string;
	added: number;
	removed: number;
	seen?: boolean;
	href?: string;
	chip?: ChipMark;
}

const FILE: FileSlots<File> = {
	key: (file) => file.path,
	path: (file) => file.path,
	added: (file) => file.added,
	removed: (file) => file.removed,
	seen: (file) => file.seen,
	href: (file) => file.href,
	chip: (file) => file.chip,
};

// Board 51's review list at a list Pane's width, the long path cut.
const REVIEW: File[] = [
	{
		path: "src/billing/invoice.ts",
		added: 4,
		removed: 2,
		seen: true,
		href: "#invoice",
	},
	{
		path: "src/billing/terms.ts",
		added: 7,
		removed: 0,
		seen: false,
		href: "#terms",
	},
	{
		path: "src/billing/invoice.test.ts",
		added: 18,
		removed: 3,
		seen: false,
		href: "#invoice-test",
	},
	{ path: LONG, added: 2, removed: 1, seen: false, href: "#docs" },
];

// A chip beside a short name at the touch width: the directory goes first, the
// name never loses its start (`biome.json` holds whole, a long one cuts to
// `pay…ces.md`), and the chip's label truncates before the path goes below it.
const CHIPPED: File[] = [
	{
		path: "biome.json",
		added: 12,
		removed: 4,
		seen: false,
		href: "#biome",
		chip: { family: "amber", label: "what the check reads" },
	},
	{
		path: "docs/flags.md",
		added: 3,
		removed: 0,
		seen: false,
		href: "#flags",
		chip: { family: "teal", label: "knowledge text" },
	},
	{
		path: LONG,
		added: 2,
		removed: 1,
		seen: false,
		href: "#terms-docs",
		chip: { family: "amber", label: "what the check reads" },
	},
];

// The seen marks given, then absent (the file glyph).
const ROWS: File[] = [
	{
		path: "src/billing/terms.ts",
		added: 7,
		removed: 0,
		seen: false,
		href: "#terms",
	},
	{
		path: "src/billing/invoice.ts",
		added: 4,
		removed: 2,
		seen: true,
		href: "#invoice",
	},
	{
		path: "src/billing/invoice.test.ts",
		added: 18,
		removed: 3,
		href: "#invoice-test",
	},
	{ path: LONG, added: 2, removed: 1, href: "#docs" },
];

// The open file's row current (its href is the page's own path) between
// two that open elsewhere.
function selected(): File[] {
	return [
		{
			path: "src/billing/invoice.ts",
			added: 4,
			removed: 2,
			seen: true,
			href: "#invoice",
		},
		{
			path: "src/billing/terms.ts",
			added: 7,
			removed: 0,
			seen: true,
			href: location.pathname,
		},
		{
			path: "src/billing/invoice.test.ts",
			added: 18,
			removed: 3,
			seen: false,
			href: "#invoice-test",
		},
	];
}

// A card of the rows, each as it is loaded or painted.
function Shown(props: { painted?: boolean }) {
	return (
		<Group
			items={REVIEW.concat(CHIPPED).map((file, at) => ({
				key: `${props.painted}${file.path}`,
				row: <FileRowBase {...file} painted={props.painted} at={at} />,
			}))}
		/>
	);
}

// Every cell draws a List of the rows; the list's rest cells add the review
// list. A `PAINT` cell draws a card of the rows loaded beside the same rows
// painted.
export function drawFileRow(frame: ShowcaseFrame) {
	if (isPaint(frame)) {
		if (frame.state !== "rest") return undefined;
		return (
			<Wide>
				<Shown />
				<Shown painted />
			</Wide>
		);
	}
	const loading = frame.state === "loading";
	const files = frame.state === "selected" ? selected() : ROWS;
	return (
		<Wide>
			<List items={files} loading={loading} file={FILE} />
			{frame.state === "rest" ? (
				<div className="flex flex-col w-list max-w-full px-page">
					<List items={REVIEW} file={FILE} />
					<List items={CHIPPED} file={FILE} />
				</div>
			) : null}
		</Wide>
	);
}

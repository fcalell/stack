import type { ChipMark } from "@fcalell/ui-core/descriptors";
import { FileRow } from "../../components/file-row/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { type FileSlots, List } from "../../components/list/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

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

// Board 51's review list at the Split's list width, the long path cut.
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
// name cuts in its middle (`biome.json` holds whole, a long one cuts to
// `bio…json`) and then to nothing, and the chip's label stays whole.
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

// A pointer or focus frame draws one row that opens over one that does not,
// so only the first takes the forced state.
const PRESSED: File[] = [
	{
		path: "src/billing/invoice.test.ts",
		added: 18,
		removed: 3,
		seen: false,
		href: "#invoice-test",
	},
	{ path: "src/billing/invoice.ts", added: 4, removed: 2, seen: true },
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

// The group ground's cells draw the rows in a Group (each FileRow its own
// loading form), every other cell a List of them; the list's rest cells add
// the review list.
export function drawFileRow(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const group =
		cell === "ROW.ground.group" || cell === "SKELETON_ROW.kind.one-line-group";
	const loading = frame.state === "loading";
	let files = PRESSED;
	if (frame.state === "rest" || loading) files = ROWS;
	else if (frame.state === "selected") files = selected();
	if (group)
		return (
			<Wide>
				<Group>
					{files.map((file) => (
						<FileRow
							key={file.path}
							path={file.path}
							added={file.added}
							removed={file.removed}
							seen={file.seen}
							href={file.href}
							loading={loading}
						/>
					))}
				</Group>
			</Wide>
		);
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

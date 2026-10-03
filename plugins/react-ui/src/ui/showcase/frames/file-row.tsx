import { FileRow } from "../../components/file-row/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { List } from "../../components/list/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const LONG = "docs/billing/payment-terms-and-late-invoices.md";

// Board 51's review list at the Split's list width, the long path cut.
function Review() {
	return (
		<div className="flex flex-col w-list max-w-full px-page">
			<List>
				<FileRow
					path="src/billing/invoice.ts"
					added={4}
					removed={2}
					seen
					href="#invoice"
				/>
				<FileRow
					path="src/billing/terms.ts"
					added={7}
					removed={0}
					seen={false}
					href="#terms"
				/>
				<FileRow
					path="src/billing/invoice.test.ts"
					added={18}
					removed={3}
					seen={false}
					href="#invoice-test"
				/>
				<FileRow path={LONG} added={2} removed={1} seen={false} href="#docs" />
			</List>
		</div>
	);
}

// The seen marks given, then absent (the file glyph), on the frame's ground.
function Rows() {
	return (
		<>
			<FileRow
				path="src/billing/terms.ts"
				added={7}
				removed={0}
				seen={false}
				href="#terms"
			/>
			<FileRow
				path="src/billing/invoice.ts"
				added={4}
				removed={2}
				seen
				href="#invoice"
			/>
			<FileRow
				path="src/billing/invoice.test.ts"
				added={18}
				removed={3}
				href="#invoice-test"
			/>
			<FileRow path={LONG} added={2} removed={1} href="#docs" />
		</>
	);
}

// A pointer or focus frame draws one row that opens over one that does not,
// so only the first takes the forced state.
function Pressed() {
	return (
		<>
			<FileRow
				path="src/billing/invoice.test.ts"
				added={18}
				removed={3}
				seen={false}
				href="#invoice-test"
			/>
			<FileRow path="src/billing/invoice.ts" added={4} removed={2} seen />
		</>
	);
}

function Loading() {
	return (
		<>
			<FileRow path="" added={0} removed={0} loading />
			<FileRow path="" added={0} removed={0} loading />
		</>
	);
}

// The group ground's cells draw the rows in a Group, every other cell in a
// List; the list's rest cells add the review list.
// The open file's row current (its href is the page's own path) between
// two that open elsewhere.
function Selected() {
	return (
		<>
			<FileRow
				path="src/billing/invoice.ts"
				added={4}
				removed={2}
				seen
				href="#invoice"
			/>
			<FileRow
				path="src/billing/terms.ts"
				added={7}
				removed={0}
				seen
				href={location.pathname}
			/>
			<FileRow
				path="src/billing/invoice.test.ts"
				added={18}
				removed={3}
				seen={false}
				href="#invoice-test"
			/>
		</>
	);
}

export function drawFileRow(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const group =
		cell === "ROW.ground.group" || cell === "SKELETON_ROW.kind.one-line-group";
	let rows = <Rows />;
	if (frame.state === "loading") rows = <Loading />;
	else if (frame.state === "selected") rows = <Selected />;
	else if (frame.state !== "rest") rows = <Pressed />;
	return (
		<Wide>
			{group ? <Group>{rows}</Group> : <List>{rows}</List>}
			{!group && frame.state === "rest" ? <Review /> : null}
		</Wide>
	);
}

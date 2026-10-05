import { Stages } from "../../components/stages/index.tsx";
import { Wide } from "./layout-context.tsx";

// A feature request's four fixed states: done ones dated, the current one
// marked, the later one grey.
const IN_BUILD = [
	{ label: "Submitted", state: "done", at: "2026-09-14T09:12:00Z" },
	{ label: "In spec", state: "done", at: "2026-09-16T15:40:00Z" },
	{ label: "In build", state: "current", at: "2026-09-22T08:05:00Z" },
	{ label: "Live", state: "later" },
] as const;

// The same request turned down at spec: the later stages give way to the
// terminal row.
const REJECTED = [
	{ label: "Submitted", state: "done", at: "2026-09-14T09:12:00Z" },
	{ label: "In spec", state: "current" },
	{ label: "In build", state: "later" },
	{ label: "Live", state: "later" },
] as const;

// Every cell draws the rail in flight and the rail ended under it.
export function drawStages() {
	return (
		<Wide>
			<Stages steps={IN_BUILD} />
			<Stages
				steps={REJECTED}
				ended={{
					label: "Rejected",
					reason: "Out of scope this quarter: resubmit with a narrower ask.",
				}}
			/>
		</Wide>
	);
}

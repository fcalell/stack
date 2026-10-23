import { type Selection, useRead } from "@fcalell/plugin-api/tanstack-query";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { Diff } from "@fcalell/plugin-react-ui/components/diff";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { useRoute } from "@fcalell/plugin-react-ui/lib/navigate";
import type { ChipMark, FileItem } from "@fcalell/ui-core/descriptors";
import type { AppRouter } from "../../../.stack/worker";
import { orpc } from "../lib/api.ts";

type Deploys = AppRouter["deploys"];
type OpenDeploy = Deploys["get"]["__output"];
type ChangedFile = Deploys["files"]["__output"][number];

// Why the review lists a file, or what its change is.
const MARKS: Record<NonNullable<ChangedFile["mark"]>, ChipMark> = {
	added: { family: "green", label: "Added" },
	dependencies: { family: "amber", label: "Dependencies" },
	generated: { family: "neutral", label: "Generated" },
};

const toRow = (file: ChangedFile, seen: boolean, href: string): FileItem => ({
	key: file.path,
	path: file.path,
	added: lines(file.after, file.before),
	removed: lines(file.before, file.after),
	seen,
	chip: file.mark ? MARKS[file.mark] : undefined,
	href,
});

// The lines of one text the other does not hold, as a line count would.
function lines(from: string, other: string): number {
	const kept = new Set(other.split("\n"));
	return from ? from.split("\n").filter((line) => !kept.has(line)).length : 0;
}

export const filesRead = (id: string) => orpc.deploys.files.read({ id });
export const logRead = (id: string) => orpc.deploys.log.read({ id });

// The files a deploy changed, from their own read, over the diff of the one
// open (`?file=`, the first without it), which its row marks; the files
// before it are seen. The Section holds the read as its items, so the list
// paints while it waits and the Section draws the failed and empty forms. The
// app's own view of the read is its files once they land, for the open file's
// place; the diff reads that file as a selection.
function useChangedFiles(id: string, named: string | undefined) {
	const route = useRoute();
	const files = filesRead(id);
	const all: readonly ChangedFile[] = useRead(files) ?? [];
	const at = Math.max(
		0,
		all.findIndex((each) => each.path === named),
	);
	const open = all[at];
	const file = files.at((each) => each[at]);
	const diff = (
		<Diff
			label={open?.path ?? ""}
			before={file.at((each) => each?.before ?? "")}
			after={file.at((each) => each?.after ?? "")}
		/>
	);
	// The open file's row is current at the page's own path.
	const rows = files.at((each) =>
		each.map((one, index) =>
			toRow(
				one,
				index <= at,
				index === at
					? route
					: `/deploys/${id}?file=${encodeURIComponent(one.path)}`,
			),
		),
	);
	return { rows, diff };
}

// A deploy's changes: the description's edit and the release notes it was
// opened with, as selections of the deploy the Pane holds, then the files and
// the build log from their own reads. A deploy that edited no description draws
// the Section's empty form.
export function DeployChanges(props: {
	deploy: Selection<OpenDeploy>;
	deployId: string;
	file?: string;
}) {
	const { deploy, deployId } = props;
	const log = logRead(deployId);
	const files = useChangedFiles(deployId, props.file);
	return (
		<>
			<Section
				title="Description"
				read={deploy.at((each) => each.description)}
				empty={{ sentence: "This deploy did not edit its description." }}
			>
				<Diff
					label="Description"
					by="word"
					before={deploy.at((each) => each.description?.before ?? "")}
					after={deploy.at((each) => each.description?.after ?? "")}
				/>
			</Section>
			<Section title="Release notes">
				<Prose markdown={deploy.at((each) => each.notes)} />
			</Section>
			<Section
				title="Changes"
				items={files.rows}
				empty={{
					sentence: "This deploy rebuilt the commit already in production.",
				}}
			/>
			{files.diff}
			<Section title="Build log" read={log}>
				<Code text={log} tail={6} copy />
			</Section>
		</>
	);
}

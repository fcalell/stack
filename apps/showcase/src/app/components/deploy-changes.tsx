import { useQuery } from "@fcalell/plugin-api/tanstack-query";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { Diff } from "@fcalell/plugin-react-ui/components/diff";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { ProseDiff } from "@fcalell/plugin-react-ui/components/prose-diff";
import { QueryBoundary } from "@fcalell/plugin-react-ui/components/query-boundary";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { useRoute } from "@fcalell/plugin-react-ui/lib/navigate";
import type { ChipMark } from "@fcalell/ui-core/descriptors";
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

const added = (file: ChangedFile) => lines(file.after, file.before);
const removed = (file: ChangedFile) => lines(file.before, file.after);

// The lines of one text the other does not hold, as a line count would.
function lines(from: string, other: string): number {
	const kept = new Set(other.split("\n"));
	return from ? from.split("\n").filter((line) => !kept.has(line)).length : 0;
}

// The files a deploy changed, from their own query, over the diff of the one
// open (`?file=`, the first without it), which its row marks; the files
// before it are seen. The list draws its own four states; the diff waits
// with it and stands only over a loaded file. Both are handed back as
// elements, so the list stands as its Section's direct child and counts there.
function useChangedFiles(id: string, named: string | undefined) {
	const route = useRoute();
	const files = useQuery(orpc.deploys.files.queryOptions({ input: { id } }));
	const all = files.data ?? [];
	const at = Math.max(
		0,
		all.findIndex((each) => each.path === named),
	);
	const open = all[at];
	let diff = null;
	if (files.isPending) diff = <Diff label="" before="" after="" loading />;
	else if (open)
		diff = <Diff label={open.path} before={open.before} after={open.after} />;
	const list = (
		<List
			query={files}
			sentence="Changes did not load."
			empty={{
				icon: "GitCommitHorizontal",
				title: "No changes",
				sentence: "This deploy rebuilt the commit already in production.",
			}}
			file={{
				key: (each) => each.path,
				path: (each) => each.path,
				added,
				removed,
				seen: (each) => all.indexOf(each) <= at,
				chip: (each) => (each.mark ? MARKS[each.mark] : undefined),
				// The open file's row is current at the page's own path.
				href: (each) =>
					each === open
						? route
						: `/deploys/${id}?file=${encodeURIComponent(each.path)}`,
			}}
		/>
	);
	return { list, diff };
}

// A deploy's changes: the description's edit and the release notes it was
// opened with, then the files and the build log from their own queries.
export function DeployChanges(props: { deploy: OpenDeploy; file?: string }) {
	const { deploy } = props;
	const log = useQuery(
		orpc.deploys.log.queryOptions({ input: { id: deploy.id } }),
	);
	const files = useChangedFiles(deploy.id, props.file);
	return (
		<>
			{deploy.description ? (
				<Section title="Description">
					<ProseDiff
						before={deploy.description.before}
						after={deploy.description.after}
					/>
				</Section>
			) : null}
			<Section title="Release notes">
				<Prose markdown={deploy.notes} />
			</Section>
			<Section title="Changes">
				{files.list}
				{files.diff}
			</Section>
			<Section title="Build log">
				<QueryBoundary
					query={log}
					sentence="The build log did not load."
					loading={<Code text="" tail={6} copy loading />}
				>
					{(text) => <Code text={text} tail={6} copy />}
				</QueryBoundary>
			</Section>
		</>
	);
}

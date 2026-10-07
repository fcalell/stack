import { createFileRoute } from "@tanstack/react-router";
import { Deploys } from "../../../../components/deploys.tsx";

export const Route = createFileRoute("/_app/deploys/$deployId/")({
	// The open file's path: the first changed file without it.
	validateSearch: (search: Record<string, unknown>) => ({
		file: typeof search.file === "string" ? search.file : undefined,
	}),
	component: OpenDeploy,
});

function OpenDeploy() {
	const { deployId } = Route.useParams();
	const { file } = Route.useSearch();
	return <Deploys deployId={deployId} file={file} />;
}

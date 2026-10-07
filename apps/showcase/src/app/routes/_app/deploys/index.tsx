import { createFileRoute } from "@tanstack/react-router";
import { Deploys } from "../../../components/deploys.tsx";

export const Route = createFileRoute("/_app/deploys/")({
	component: () => <Deploys />,
});

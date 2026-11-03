import {
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/keys")({
	component: Keys,
});

const SCOPES = [
	{ value: "read", label: "Read", description: "Lists deploys and usage" },
	{ value: "write", label: "Write", description: "Starts and cancels deploys" },
	{
		value: "admin",
		label: "Admin",
		description: "Manages members and billing",
	},
] as const;

type Draft = {
	name?: string;
	scope?: "read" | "write" | "admin";
	token?: string;
};

// A new API key: the token is a masked line (`control: "secret"`), left out of
// the form's `values` so it is never read back, and the form's `after` is a
// function of the input the fields make, so the request it would send is a read
// drawn after the fields, from the first values and as the viewer types.
function Preview({ draft }: { draft: Draft }) {
	// The preview asks for the token's length, never the token: a secret stays
	// out of a read's address.
	const preview = orpc.keys.preview.read({
		name: draft.name,
		scope: draft.scope,
		tokenLength: draft.token?.length,
	});
	// A read that ended or answered nothing says so (it draws its own failure): the form's `after` is a
	// block, and a block that draws nothing would only reserve room.
	const [drawn] = useSelections([preview]);
	useDrawsFailure([preview]);
	const said = drawn.painted
		? drawn.phase === "failed" || drawn.phase === "missing"
		: drawn.value.length === 0;
	if (said) return <Text kind="meta">Nothing to send yet.</Text>;
	return (
		<Code
			text={preview.at((facts) =>
				facts.map((fact) => `${fact.label}: ${fact.value}`).join("\n"),
			)}
		/>
	);
}

function Keys() {
	return (
		<Pane title="API keys">
			<Section
				title="New key"
				description="A key reads the API as the member who made it."
			>
				<Form
					act={orpc.keys.create}
					values={{ scope: "read" }}
					fields={{
						name: { label: "Name" },
						scope: { label: "Scope", options: SCOPES },
						token: {
							label: "Token",
							control: "secret",
							description: "Shown once; paste it where it is used.",
						},
						note: { label: "Note", control: "prose" },
					}}
					submit={{ label: "Create key", done: "Key created" }}
					after={(input) => <Preview draft={input} />}
				/>
			</Section>
		</Pane>
	);
}

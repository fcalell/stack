import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
// the form's `values` so it is never read back, and the form's `onChange` hears
// the input the fields make, so the request it would send is a read drawn under
// it as the viewer types.
function Keys() {
	const [draft, setDraft] = useState<Draft>({});
	// The preview asks for the token's length, never the token: a secret stays
	// out of a read's address.
	const preview = orpc.keys.preview.read({
		name: draft.name,
		scope: draft.scope,
		tokenLength: draft.token?.length,
	});
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
					onChange={setDraft}
				/>
			</Section>
			<Section
				title="Request preview"
				description="What the form would send as it stands."
				items={preview.at((facts) =>
					facts.map((fact) => ({
						key: fact.label,
						label: fact.label,
						title: fact.value,
					})),
				)}
			/>
		</Pane>
	);
}

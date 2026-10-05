import type { Run } from "@fcalell/ui-core/descriptors";
import { use, useState } from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { AuthColumn } from "../../components/auth-column/index.tsx";
import { Banner } from "../../components/banner/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { InputOtp } from "../../components/input-otp/index.tsx";
import { List } from "../../components/list/index.tsx";
import { act, HereContext, settle } from "./here.ts";

// Two pages outside the shell, each one `AuthColumn`: the sign-in's email
// step and the code step its Continue swaps in, and the first of the two
// Connect steps. `&query=error` stands a warn banner over either.
const PRODUCT = "Acme";
const ADDRESS = "ana@acme.dev";
const SIGN_IN_EXPIRED =
	"This sign-in request has expired. Start again from your client.";
const CONNECT_EXPIRED =
	"This connection request has expired. Start it again from your client.";

function Notice(props: { sentence: string }) {
	const { query } = use(HereContext);
	return query === "error" ? (
		<Banner kind="warn" sentence={props.sentence} />
	) : null;
}

export function SignIn() {
	const [at, setAt] = useState<"email" | "code">("email");
	const [email, setEmail] = useState(ADDRESS);
	const [code, setCode] = useState("");
	const coded = at === "code";
	const sentence: readonly Run[] = coded
		? ["We sent a code to ", { strong: email }]
		: ["Your invitation went to ", { strong: ADDRESS }, "."];
	return (
		<AuthColumn
			product={PRODUCT}
			title={coded ? "Check your email" : "Sign in"}
			sentence={sentence}
			banner={<Notice sentence={SIGN_IN_EXPIRED} />}
		>
			{coded ? (
				<Form key="code">
					<FormField label="Code">
						<InputOtp length={6} value={code} onChange={setCode} />
					</FormField>
					<ActionBar
						acts={[
							{ label: "Back", onAct: () => setAt("email") },
							{ label: "Resend", onAct: () => settle(), quiet: true },
							{
								label: "Verify",
								onAct: () => settle(),
								blocked:
									code.length === 6 ? undefined : "Enter the 6-digit code.",
							},
						]}
					/>
				</Form>
			) : (
				<Form key="email">
					<FormField label="Email">
						<Input kind="email" value={email} onChange={setEmail} />
					</FormField>
					<ActionBar
						acts={[
							{
								label: "Continue",
								onAct: () => setAt("code"),
								blocked: email.includes("@") ? undefined : "Enter your email.",
							},
						]}
					/>
				</Form>
			)}
		</AuthColumn>
	);
}

const WORKSPACES = [
	{ name: "Acme", meta: "12 members" },
	{ name: "Globex", meta: "4 members" },
	{ name: "Initech", meta: "31 members" },
];

export function Connect() {
	return (
		<AuthColumn
			product={PRODUCT}
			step={{ at: 1, of: 2 }}
			title="Choose a workspace"
			sentence={["Signed in as ", { strong: ADDRESS }]}
			banner={<Notice sentence={CONNECT_EXPIRED} />}
		>
			<Group>
				<List
					items={WORKSPACES}
					row={{
						key: (item) => item.name,
						title: (item) => item.name,
						meta: (item) => [item.meta],
						leading: { avatar: (item) => ({ name: item.name }) },
						onOpen: act,
					}}
				/>
			</Group>
		</AuthColumn>
	);
}

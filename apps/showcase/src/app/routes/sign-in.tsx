import { useMutation, useQuery } from "@fcalell/plugin-api/tanstack-query";
import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { InputOtp } from "@fcalell/plugin-react-ui/components/input-otp";
import type { Sentence } from "@fcalell/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { orpc } from "../lib/api.ts";

export const Route = createFileRoute("/sign-in")({
	component: SignIn,
});

const MARK = { src: "/mark.svg", name: "Acme" };
const EXPIRED =
	"This sign-in request has expired. Start again from your client.";

// A page outside the shell, one `Gate`: the email step and the code step its
// Continue swaps in.
function SignIn() {
	const request = useQuery(orpc.account.request.queryOptions());
	const sendCode = useMutation(orpc.account.sendCode.mutationOptions());
	const verify = useMutation(orpc.account.verify.mutationOptions());
	const [at, setAt] = useState<"email" | "code">("email");
	const [typed, setTyped] = useState<string>();
	const [code, setCode] = useState("");
	const invited = request.data?.email;
	const email = typed ?? invited ?? "";
	const coded = at === "code";
	let description: Sentence | undefined;
	if (coded) description = ["We sent a code to ", { strong: email }];
	else if (invited)
		description = ["Your invitation went to ", { strong: invited }, "."];
	return (
		<Gate
			mark={MARK}
			title={coded ? "Check your email" : "Sign in"}
			description={description}
			banner={
				request.isError ? <Banner kind="warn" sentence={EXPIRED} /> : undefined
			}
		>
			{coded ? (
				<Form key="code">
					<FormField label="Code">
						<InputOtp length={6} value={code} onChange={setCode} />
					</FormField>
					<ActionBar
						acts={[
							{ label: "Back", onAct: () => setAt("email") },
							{
								label: "Resend",
								onAct: () => sendCode.mutateAsync({ email }),
								quiet: true,
							},
							{
								label: "Verify",
								onAct: () => verify.mutateAsync({ email, code }),
								blocked:
									code.length === 6 ? undefined : "Enter the 6-digit code.",
							},
						]}
					/>
				</Form>
			) : (
				<Form key="email">
					<FormField label="Email">
						<Input kind="email" value={email} onChange={setTyped} />
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
		</Gate>
	);
}

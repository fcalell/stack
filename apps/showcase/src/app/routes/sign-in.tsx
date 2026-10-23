import { useMutation, useQuery } from "@fcalell/plugin-api/tanstack-query";
import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import type { Runs } from "@fcalell/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { orpc } from "../lib/api.ts";

export const Route = createFileRoute("/sign-in")({
	component: SignIn,
});

const EXPIRED =
	"This sign-in request has expired. Start again from your client.";

// A page outside the shell, one `Gate`: the email step, and the code step its
// Continue swaps in.
function SignIn() {
	const request = useQuery(orpc.account.request.queryOptions());
	const sendOtp = useMutation(orpc.auth.signIn.sendOtp.mutationOptions());
	const [sentTo, setSentTo] = useState<string>();
	const invited = request.data?.email;
	const banner = request.isError ? (
		<Banner tone="attention" sentence={EXPIRED} />
	) : undefined;
	if (sentTo !== undefined) {
		return (
			<Gate
				title="Check your email"
				description={["We sent a code to ", { strong: sentTo }]}
				banner={banner}
				form={{
					act: orpc.auth.signIn.verifyOtp,
					given: { email: sentTo },
					fields: { code: { label: "Code", control: "code" } },
					submit: { label: "Verify" },
				}}
			>
				<Button act="quiet" label="Back" onAct={() => setSentTo(undefined)} />
				<Button
					act="quiet"
					label="Resend"
					onAct={() => sendOtp.mutateAsync({ email: sentTo })}
				/>
			</Gate>
		);
	}
	let description: Runs | undefined;
	if (invited)
		description = ["Your invitation went to ", { strong: invited }, "."];
	return (
		<Gate
			title="Sign in"
			description={description}
			banner={banner}
			form={{
				act: orpc.auth.signIn.sendOtp,
				values: invited ? { email: invited } : undefined,
				fields: { email: { label: "Email" } },
				submit: { label: "Continue" },
				onDone: ({ email }) => setSentTo(email),
			}}
		/>
	);
}

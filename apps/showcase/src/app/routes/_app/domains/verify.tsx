import { useMutation } from "@fcalell/plugin-api/tanstack-query";
import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { InputOtp } from "@fcalell/plugin-react-ui/components/input-otp";
import { Link } from "@fcalell/plugin-react-ui/components/link";
import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import { Screen } from "@fcalell/plugin-react-ui/components/screen";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { orpc } from "../../../lib/api.ts";

export const Route = createFileRoute("/_app/domains/verify")({
	component: Verify,
});

const DOMAIN = "shop.acme.dev";

// A Screen pushed over Domains. The form is about one domain, so it opens on
// that domain: one ListRow in a Group, its glyph, name and project, opening
// Domains to change it.
function Verify() {
	const [code, setCode] = useState("482913");
	const verify = useMutation(orpc.domains.verify.mutationOptions());
	return (
		<Screen title="Verify domain" back="/domains">
			<Form>
				<Group>
					<ListRow
						leading={{ icon: "Globe" }}
						title={DOMAIN}
						meta={["acme-web", "Production"]}
						href="/domains"
					/>
				</Group>
				<Text>
					Enter the six-digit code from the TXT record we added to {DOMAIN}.
				</Text>
				<FormField label="Code">
					<InputOtp length={6} value={code} onChange={setCode} />
				</FormField>
				<Link href="#record" fit="standalone">
					Show the DNS record again
				</Link>
				<ActionBar
					acts={[
						{
							label: "Verify",
							onAct: async () => {
								await verify.mutateAsync({ name: DOMAIN, code });
								toast(`${DOMAIN} verified`, { state: "done" });
							},
						},
					]}
				/>
			</Form>
		</Screen>
	);
}

import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "../../../lib/api.ts";

export const Route = createFileRoute("/_app/domains/verify")({
	component: Verify,
});

const DOMAIN = "shop.acme.dev";

// A covering Pane pushed over Domains. The form is about one domain, so it opens on
// that domain: one list item in a Section, its glyph, name and project, opening
// Domains to change it.
function Verify() {
	return (
		<Pane title="Verify domain" back="/domains" cover>
			<Section
				items={[
					{
						key: "domain",
						leading: { icon: "Globe" },
						title: DOMAIN,
						meta: ["acme-web", "Production"],
						href: "/domains",
					},
				]}
			/>
			<Text>
				Enter the six-digit code from the TXT record we added to {DOMAIN}.
			</Text>
			<Form
				act={orpc.domains.verify}
				given={{ name: DOMAIN }}
				values={{ code: "482913" }}
				fields={{ code: { label: "Code" } }}
				submit={{ label: "Verify", done: `${DOMAIN} verified` }}
			/>
			<Button href="#record" label="Show the DNS record again" />
		</Pane>
	);
}

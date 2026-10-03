import { ProseDiff } from "../../components/prose-diff/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const BEFORE =
	"Invoices are due 30 days after they are issued. Late invoices are flagged in the billing list, and the customer receives a reminder by email. A reminder goes out once; nobody is charged a late fee automatically.";
const AFTER =
	"Invoices are due on the customer's payment terms, 30 days by default. Late invoices are flagged in the billing list, and the customer receives a reminder by email and in the app. A reminder goes out on the day it is due and again a week later; nobody is charged a late fee automatically.";

// Board 51's edited description in its Section, at rest and waiting.
export function drawProseDiff(frame: ShowcaseFrame) {
	return (
		<Wide>
			<Section title="Description" description="Edited by Ana Ruiz, 2 h ago">
				<ProseDiff
					before={BEFORE}
					after={AFTER}
					loading={frame.state === "loading"}
				/>
			</Section>
		</Wide>
	);
}

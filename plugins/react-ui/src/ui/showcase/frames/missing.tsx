import type { ReactNode } from "react";
import { Group } from "../../components/group/index.tsx";
import { Missing } from "../../components/missing/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Column } from "./place.tsx";

const NOWHERE = "Nothing is at this address.";
const OPEN_NOW = { label: "Open Now", href: "/" } as const;
const BACK = { label: "Back", href: "/" } as const;

// A page as tall as the viewport, so a Missing alone in its body centres in
// what the body leaves.
function Page(props: { children: ReactNode }) {
	return (
		<Column>
			<div className="flex flex-col h-dvh">
				<Place title="Not found">{props.children}</Place>
			</div>
		</Column>
	);
}

// Each form on the cells it draws: on a page it centres in what the body
// leaves, in a Section it stands in the hairline frame, in a Group in the
// card; the act is the way back in each, the hairline one with no plus.
export function drawMissing(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "EMPTY_FRAME" || cell === "BUTTON.act.secondary")
		return (
			<Column>
				<Place title="Settings">
					<Section
						title="Webhooks"
						description="Where Acme posts deploy events."
					>
						<Missing act={BACK} />
					</Section>
				</Place>
			</Column>
		);
	if (cell === "EMPTY_CARD")
		return (
			<Column>
				<Place title="Settings">
					<Section title="Webhooks">
						<Group>
							<Missing sentence="This endpoint was removed." act={OPEN_NOW} />
						</Group>
					</Section>
				</Place>
			</Column>
		);
	return (
		<Page>
			<Missing sentence={NOWHERE} act={OPEN_NOW} />
		</Page>
	);
}

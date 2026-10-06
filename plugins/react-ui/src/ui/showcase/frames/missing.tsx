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

// Each form on the matrix cells it draws (a frame stands on a family cell,
// never on a single-class one such as `EMPTY_FRAME`): the page, once, on the
// body fit, centred in what the body leaves; the Section, on the secondary
// act, in the hairline frame; the Group, on the bar fit and the sentence, in
// the card. The act is the way back in each, the hairline one with no plus.
export function drawMissing(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "BUTTON.act.secondary" || cell === "BUTTON_LABEL.act.secondary")
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
	if (cell === "BUTTON.fit.bar" || cell === "TEXT.role.meta")
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

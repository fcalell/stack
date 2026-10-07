import type { ReactNode } from "react";
import { Failed } from "../../components/failed/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Column } from "./place.tsx";

const retry = () => {};
const RETRY = { label: "Retry", onAct: retry };
const COULD_NOT_LOAD = "Could not load the file.";

// A page as tall as the viewport, so a Failed alone in its body centres in
// what the body leaves.
function Page(props: { children: ReactNode }) {
	return (
		<Column>
			<div className="flex flex-col h-dvh">
				<Place title="Review">{props.children}</Place>
			</div>
		</Column>
	);
}

// Each form on the cells it draws: the page, once, on the bar fit centred in
// what the body leaves; the Section, in the hairline frame, on the mark and
// the secondary act; the Group, in the card, on the sentence; and a first
// run, on the body fit. The act is Retry in each, the hairline one with no
// plus, under the alert mark.
export function drawFailed(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (
		cell === "BUTTON.act.secondary" ||
		cell === "BUTTON_LABEL.act.secondary" ||
		cell === "EMPTY_MARK" ||
		cell === "ICON.fit.control"
	)
		return (
			<Column>
				<Place title="Settings">
					<Section
						title="Webhooks"
						description="Where Acme posts deploy events."
					>
						<Failed sentence="Webhooks did not load." act={RETRY} />
					</Section>
				</Place>
			</Column>
		);
	if (cell === "TEXT.role.meta" || cell === "EMPTY_CARD")
		return (
			<Column>
				<Place title="Settings">
					<Section title="Webhooks">
						<Group>
							<Failed sentence="Webhooks did not load." act={RETRY} />
						</Group>
					</Section>
				</Place>
			</Column>
		);
	if (cell === "BUTTON.fit.body")
		return (
			<div className="flex flex-col items-center justify-center p-sections bg-canvas w-screen max-w-full">
				<Failed sentence={COULD_NOT_LOAD} act={RETRY} />
			</div>
		);
	return (
		<Page>
			<Failed sentence={COULD_NOT_LOAD} act={RETRY} />
		</Page>
	);
}

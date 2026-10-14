import type { ReactNode } from "react";
import { Group } from "../../components/group/index.tsx";
import { Missing } from "../../components/missing/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { readsAt } from "../waiting.ts";
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
				<Place>
					<Pane title="Not found">{props.children}</Pane>
				</Place>
			</div>
		</Column>
	);
}

// Each form on the matrix cells it draws (a frame stands on a family cell,
// never on a single-class one such as `EMPTY_FRAME`): the page, once, on the
// body fit, centred in what the body leaves; the Section, on the secondary
// act, in the hairline frame; a Section holding a missing read, on the bar fit
// and the sentence. The act is the way back in each, the hairline one with no
// plus.
export function drawMissing(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "BUTTON.act.secondary" || cell === "BUTTON_LABEL.act.secondary")
		return (
			<Column>
				<Place>
					<Pane title="Settings">
						<Section
							title="Webhooks"
							description="Where Acme posts deploy events."
						>
							<Missing act={BACK} />
						</Section>
					</Pane>
				</Place>
			</Column>
		);
	if (cell === "BUTTON.fit.bar" || cell === "TEXT.role.meta") {
		const { missing } = readsAt(frame.id);
		return (
			<Column>
				<Place>
					<Pane title="Settings">
						<Section title="Webhooks" read={missing}>
							<Group
								list={{ items: missing, row: { key: String, title: String } }}
							/>
						</Section>
					</Pane>
				</Place>
			</Column>
		);
	}
	return (
		<Page>
			<Missing sentence={NOWHERE} act={OPEN_NOW} />
		</Page>
	);
}

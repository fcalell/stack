import { ActionBar } from "../../components/action-bar/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { StepCount } from "../../components/step-count/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const change = () => {};
const never = () => new Promise<void>(() => {});

// An onboarding step: its count over the question it asks, one field and the
// act that moves on. A `STEP_COUNT_SEGMENT` cell also stands the count's
// shortest and longest forms beside it, so each state shows at both ends.
export function drawStepCount(frame: ShowcaseFrame) {
	const range = frame.cell.name.startsWith("STEP_COUNT_SEGMENT");
	return (
		<Wide>
			{range ? (
				<>
					<StepCount at={1} of={2} />
					<StepCount at={3} of={4} />
				</>
			) : null}
			<StepCount at={2} of={3} />
			<Form>
				<Section
					title="Name your workspace"
					description="Your team sees it in the sidebar and in invites."
				>
					<FormField label="Workspace name">
						<Input value="Acme Inc" onChange={change} />
					</FormField>
				</Section>
				<ActionBar
					acts={[
						{ label: "Back", onAct: change },
						{ label: "Continue", onAct: never },
					]}
				/>
			</Form>
		</Wide>
	);
}

import { Card } from "../../components/card/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Picker } from "../../components/picker/index.tsx";
import { Prose } from "../../components/prose/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Slider } from "../../components/slider/index.tsx";
import { Stats } from "../../components/stats/index.tsx";
import { Wide } from "./layout-context.tsx";

const NOTE =
	"Every pull request gets its own preview URL, torn down when the branch merges.";
const change = () => {};

// A usage window: its meter is a Stats, a card of its own, and the reserve a
// part that is no row, in a Card beside it. A Stats never stands in a Card (a
// box in a box).
const WINDOW = [
	{
		label: "Used",
		value: 42,
		bound: 100,
		line: "Resets at 13:44",
	},
] as const;

// The card at rest, standing a Prose on its surface; then fields placed alone
// in a Card, which take the label column the Section's cards share (the name
// over the box on touch): an optional text area, a line and a pick that holds
// none; and a usage window, a Stats and a Card of its own.
export function drawCard() {
	return (
		<Wide>
			<Card>
				<Prose markdown={NOTE} />
			</Card>
			<Section title="Package">
				<Card>
					<Input
						label="Package directory"
						optional
						kind="prose"
						value=""
						placeholder="/home/you/mail"
						onChange={change}
					/>
				</Card>
			</Section>
			<Section title="Fields">
				<Card>
					<Input label="Address" value="db.internal:5432" onChange={change} />
					<Picker
						label="Projects"
						description="Each runs in the same session."
						options={[
							{ value: "triage", label: "Triage" },
							{ value: "retro", label: "Retro" },
						]}
						value={[]}
						onChange={change}
					/>
				</Card>
			</Section>
			<Section title="Five hours">
				<Stats items={WINDOW} />
				<Card>
					<Slider
						label="Reserve"
						value={0}
						min={0}
						max={100}
						onChange={change}
					/>
				</Card>
			</Section>
		</Wide>
	);
}

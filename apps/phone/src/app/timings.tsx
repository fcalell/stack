import { FormField } from "@fcalell/plugin-native-ui/components/form-field";
import { Pane } from "@fcalell/plugin-native-ui/components/pane";
import { Place } from "@fcalell/plugin-native-ui/components/place";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { timings } from "@fcalell/ui-core/paint";
import { useState } from "react";

// The dev bench for the phone's timings: a paint shows after the wait delay,
// an act's pending look after the act delay, and a read's first answer waits
// until the paint has stood for the minimum. A change applies on the next
// mount, as `timings` says.
const KNOBS = [
	{ key: "waitDelay", label: "Wait delay", max: 1000 },
	{ key: "actDelay", label: "Act delay", max: 1000 },
	{ key: "waitMin", label: "Minimum", max: 1000 },
] as const;

export default function Timings() {
	const [values, setValues] = useState({ ...timings });
	return (
		<Place>
			<Pane title="Timings">
				<Section title="Delays">
					{KNOBS.map((knob) => (
						<FormField
							key={knob.key}
							label={knob.label}
							slider={{
								value: values[knob.key],
								min: 0,
								max: knob.max,
								step: 25,
								unit: "millisecond",
								onChange: (value) => {
									timings[knob.key] = value;
									setValues({ ...values, [knob.key]: value });
								},
							}}
						/>
					))}
				</Section>
			</Pane>
		</Place>
	);
}

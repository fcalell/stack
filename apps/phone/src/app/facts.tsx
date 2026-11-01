import { Pane } from "@fcalell/plugin-native-ui/components/pane";
import { Picker } from "@fcalell/plugin-native-ui/components/picker";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { useState } from "react";

// The dev page for a row's facts as badges: every kind of fact in one row, a
// fact longer than the line cut inside its badge, badges wrapping whole, the
// lone `{ code }` value, a record's head and a picker's recommended option.
// Open it on the smallest device: at 320 pt a row stands its badges a line
// each where they do not fit, and no badge breaks inside.
const LONG =
	"A branch name that is far longer than the line the badge stands on, so it is cut inside its box";

export default function Facts() {
	const [one, setOne] = useState<"a" | "b" | null>("a");
	return (
		<Pane
			title="Facts"
			record={{
				within: "Work · Code",
				overline: ["Agents", "Implement", "round 2"],
				facts: [
					{ tone: "running", label: "Running" },
					{ warning: "Tests failed twice" },
					{ family: "green", label: "Free" },
					{ count: 3, label: "Open" },
					{ label: "Held by Fast", href: "/facts" },
					{ ring: true, label: "Required" },
					{ flag: "Shield", label: "Personal data" },
					{ flag: "Globe", label: "Outside content", words: false },
				],
			}}
		>
			<Section
				title="Every kind"
				items={[
					{
						key: "all",
						leading: { icon: "GitBranch" },
						title: "Show reading progress on the shelf",
						facts: [
							{ tone: "running", label: "Running" },
							{ warning: "Tests failed twice" },
							{ family: "green", label: "Free" },
							{ family: "neutral", label: "Draft" },
							{ ring: true, label: "Required" },
							{ flag: "Shield", label: "Personal data" },
							"at Implement",
							"round 2",
						],
						lock: { reason: "Held by Fast", href: "/facts" },
						trailing: { age: new Date(Date.now() - 18_000).toISOString() },
					},
					{
						key: "long",
						title: "A fact longer than its line",
						facts: [{ tone: "failed", label: "Failed" }, LONG, "short"],
					},
					{
						key: "code",
						title: "A lone code value",
						facts: [{ code: "pnpm turbo run build --filter=phone" }],
					},
					{
						key: "none",
						title: "A status alone",
						facts: [{ tone: "waiting" }],
					},
				]}
			/>
			<Picker
				fit="list"
				label="Options"
				options={[
					{
						value: "a",
						label: "First",
						recommended: true,
						line: "The one most people pick",
						leading: { icon: "Star" },
					},
					{
						value: "b",
						label: "Second",
						leading: { tone: "running" },
					},
				]}
				value={one}
				onChange={setOne}
			/>
		</Pane>
	);
}

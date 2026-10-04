import { DefinitionRow } from "@fcalell/plugin-native-ui/components/definition-row";
import { Group } from "@fcalell/plugin-native-ui/components/group";
import { Place } from "@fcalell/plugin-native-ui/components/place";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Platform } from "react-native";

const platforms: Record<typeof Platform.OS, string> = {
	android: "Android",
	ios: "iOS",
	macos: "macOS",
	windows: "Windows",
	web: "Web",
};

export default function Home() {
	return (
		<Place title="Home">
			<Section title="This device">
				<Group>
					<DefinitionRow label="Platform" value={platforms[Platform.OS]} />
					<DefinitionRow label="OS version" value={String(Platform.Version)} />
					<DefinitionRow label="State" value={{ status: "active" }} />
				</Group>
			</Section>
		</Place>
	);
}

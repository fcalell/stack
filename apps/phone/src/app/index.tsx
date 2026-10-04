import { DefinitionRow } from "@fcalell/plugin-native-ui/components/definition-row";
import { Group } from "@fcalell/plugin-native-ui/components/group";
import { Place } from "@fcalell/plugin-native-ui/components/place";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Platform } from "react-native";

export default function Home() {
	return (
		<Place title="Home">
			<Section title="This device">
				<Group>
					<DefinitionRow label="Platform" value={Platform.OS} />
					<DefinitionRow label="OS version" value={String(Platform.Version)} />
					<DefinitionRow label="State" value={{ status: "active" }} />
				</Group>
			</Section>
		</Place>
	);
}

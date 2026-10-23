import { Pane } from "@fcalell/plugin-native-ui/components/pane";
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
		<Pane title="Home">
			<Section
				title="This device"
				items={[
					{ label: "Platform", title: platforms[Platform.OS] },
					{ label: "OS version", title: String(Platform.Version) },
					{ label: "State", title: { status: "active" } },
				]}
			/>
		</Pane>
	);
}

import { audioOutput } from "@fcalell/plugin-native-ui/audio/expo";
import { Dock } from "@fcalell/plugin-native-ui/components/dock";
import { Shell } from "@fcalell/plugin-native-ui/components/shell";
import { connectOutput } from "@fcalell/plugin-native-ui/lib/player";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { Stack } from "expo-router";

const places: PlaceSpec[] = [
	{ route: "/", label: "Home", icon: "House" },
	{ route: "/notes", label: "Notes", icon: "NotebookPen" },
	{ route: "/ask", label: "Ask", icon: "MessageSquare" },
	{ route: "/player", label: "Player", icon: "Music" },
	// The motion tuning page and the facts page are for development only.
	...(__DEV__
		? ([
				{ route: "/motion", label: "Motion", icon: "Timer" },
				{ route: "/facts", label: "Facts", icon: "Tags" },
			] as PlaceSpec[])
		: []),
];

// The sound the player plays through: the app's, made when the first track loads.
connectOutput(audioOutput());

export default function Layout() {
	return (
		<Shell places={places} foot={<Dock />}>
			<Stack screenOptions={{ headerShown: false, animation: "none" }} />
		</Shell>
	);
}

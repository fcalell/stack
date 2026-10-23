import { Shell } from "@fcalell/plugin-native-ui/components/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { Stack } from "expo-router";

const places: PlaceSpec[] = [
	{ route: "/", label: "Home", icon: "House" },
	{ route: "/notes", label: "Notes", icon: "NotebookPen" },
	{ route: "/ask", label: "Ask", icon: "MessageSquare" },
	// The motion tuning page is for development only.
	...(__DEV__
		? [{ route: "/motion", label: "Motion", icon: "Timer" } as PlaceSpec]
		: []),
];

export default function Layout() {
	return (
		<Shell places={places}>
			<Stack screenOptions={{ headerShown: false, animation: "none" }} />
		</Shell>
	);
}

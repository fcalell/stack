import { Shell } from "@fcalell/plugin-native-ui/components/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { Slot } from "expo-router";

const places: PlaceSpec[] = [
	{ route: "/", label: "Home", icon: "House" },
	{ route: "/notes", label: "Notes", icon: "NotebookPen" },
	{ route: "/ask", label: "Ask", icon: "MessageSquare" },
];

export default function Layout() {
	return (
		<Shell places={places}>
			<Slot />
		</Shell>
	);
}

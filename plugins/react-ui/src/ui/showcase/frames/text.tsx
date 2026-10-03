import { Text } from "../../components/text/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// Each cell draws the component in that role; a `TEXT_STRONG` cell draws a
// strong run inside a sentence of that role.
export function drawText(frame: ShowcaseFrame) {
	switch (frame.cell.name) {
		case "TEXT.role.body":
			return <Text role="body">A primary line, the body of a paragraph.</Text>;
		case "TEXT.role.meta":
			return (
				<Text role="meta">A secondary line that describes the one above.</Text>
			);
		case "TEXT_STRONG.role.body":
			return (
				<Text role="body">
					The current build serves <Text strong>acme.app</Text> and its preview
					aliases.
				</Text>
			);
		case "TEXT_STRONG.role.meta":
			return (
				<Text role="meta">
					Promoted 4 min ago by <Text strong>Ana Ruiz</Text>
				</Text>
			);
		default:
			return undefined;
	}
}

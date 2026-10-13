import { Strong } from "../../components/strong/index.tsx";
import { Text } from "../../components/text/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// Each cell draws a strong run inside a sentence of that role.
export function drawStrong(frame: ShowcaseFrame) {
	switch (frame.cell.name) {
		case "TEXT_STRONG.role.body":
			return (
				<Text role="body">
					The current build serves <Strong>acme.app</Strong> and its preview
					aliases.
				</Text>
			);
		case "TEXT_STRONG.role.meta":
			return (
				<Text role="meta">
					Promoted 4 min ago by <Strong>Ana Ruiz</Strong>
				</Text>
			);
		default:
			return undefined;
	}
}

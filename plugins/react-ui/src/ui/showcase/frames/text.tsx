import { Text } from "../../components/text/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// Each cell draws the component in that role, two sentences long so its
// paragraph runs to the measure, which both roles hold at one width.
export function drawText(frame: ShowcaseFrame) {
	switch (frame.cell.name) {
		case "TEXT.role.body":
			return (
				<Text role="body">
					A primary line, the body of a paragraph. It runs on past one line, so
					the frame shows where the measure ends and the paragraph wraps.
				</Text>
			);
		case "TEXT.role.meta":
			return (
				<Text role="meta">
					A secondary line that describes the one above. It runs on past one
					line, to the same width as a primary line does.
				</Text>
			);
		default:
			return undefined;
	}
}

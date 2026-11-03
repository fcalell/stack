import { Text } from "../../components/text/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// Code in a sentence at 320: a URL stands whole and one box, and a long command
// in brackets keeps them on its line, cut with an ellipsis where it alone is
// wider than the line.
const CODED = [
	"Type it as ",
	{ code: "ha.lan:8123" },
	" or ",
	{ code: "http://ha.lan:8123" },
	". Compare each fingerprint with what the machine shows (",
	{ code: "ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub" },
	").",
];

// Each cell draws the component in that role, two sentences long so its
// paragraph runs to the measure, which both roles hold at one width. The body
// draws a sentence of code runs under it.
export function drawText(frame: ShowcaseFrame) {
	switch (frame.cell.name) {
		case "TEXT.role.body":
			return (
				<>
					<Text kind="body">
						A primary line, the body of a paragraph. It runs on past one line,
						so the frame shows where the measure ends and the paragraph wraps.
					</Text>
					<Text kind="body">{CODED}</Text>
				</>
			);
		case "TEXT.role.meta":
			return (
				<Text kind="meta">
					A secondary line that describes the one above. It runs on past one
					line, to the same width as a primary line does.
				</Text>
			);
		default:
			return undefined;
	}
}

import { Link } from "../../components/link/index.tsx";
import { Text } from "../../components/text/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// `LINK.fit.inline` draws the link inside a line of body text,
// `LINK.fit.standalone` on its own.
export function drawLink(frame: ShowcaseFrame) {
	if (frame.cell.name === "LINK.fit.inline")
		return (
			<Text role="body">
				Read the <Link href="#">deploy guide</Link> first.
			</Text>
		);
	if (frame.cell.name === "LINK.fit.standalone")
		return (
			<Link href="#" fit="standalone">
				All deployments
			</Link>
		);
	return undefined;
}

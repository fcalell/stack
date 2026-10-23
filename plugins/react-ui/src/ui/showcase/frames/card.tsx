import { Card } from "../../components/card/index.tsx";
import { Prose } from "../../components/prose/index.tsx";
import { Wide } from "./layout-context.tsx";

const NOTE =
	"Every pull request gets its own preview URL, torn down when the branch merges.";

// The card at rest, standing a Prose on its surface.
export function drawCard() {
	return (
		<Wide>
			<Card>
				<Prose markdown={NOTE} />
			</Card>
		</Wide>
	);
}

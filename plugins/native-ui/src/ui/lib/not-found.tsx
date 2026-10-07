import { useContext } from "react";
import { Gate } from "../components/gate";
import { Link } from "../components/link";
import { Missing } from "../components/missing";
import { Place } from "../components/place";
import { ShellHome } from "./frame";
import { useWords } from "./words";

// The page for an address nothing serves: the app's `+not-found` route, which
// stack's generated file re-exports, so it stands where expo-router stands a
// route, inside the root layout's Shell when the layout draws one and alone
// when it does not.
export default function NotFound() {
	const words = useWords();
	const home = useContext(ShellHome);
	if (home === undefined)
		return (
			<Gate title={words.notFound} description={[words.nowhere]}>
				<Link href="/" fit="standalone">
					{words.back}
				</Link>
			</Gate>
		);
	return (
		<Place title={words.notFound}>
			<Missing sentence={words.nowhere} act={home} />
		</Place>
	);
}

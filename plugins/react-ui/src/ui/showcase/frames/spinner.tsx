import { Spinner } from "../../components/spinner/index.tsx";

// The ring in a place whose ink is `ink-meta`, the ink it takes as
// currentColor.
export function drawSpinner() {
	return (
		<span className="flex text-ink-meta">
			<Spinner />
		</span>
	);
}

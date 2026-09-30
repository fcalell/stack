import { Count } from "../../components/count/index.tsx";

// The single-cell pill: a one-, two- and three-digit value and zero.
export function drawCount() {
	return (
		<span className="flex items-center gap-inside">
			<Count value={3} />
			<Count value={12} />
			<Count value={128} />
			<Count value={0} />
		</span>
	);
}

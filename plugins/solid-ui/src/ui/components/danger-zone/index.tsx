import { Polymorphic } from "@kobalte/core/polymorphic";
import { TriangleAlert } from "lucide-solid";
import { Button } from "#components/button";
import { Inset } from "#components/inset";

type DangerZoneProps = {
	description: string;
	actionLabel: string;
	onAction: () => void;
	disabled?: boolean;
	headingLevel?: 2 | 3 | 4;
	class?: never;
	style?: never;
	classList?: never;
};

function DangerZone(props: DangerZoneProps) {
	const tag = () => `h${props.headingLevel ?? 3}` as "h2" | "h3" | "h4";

	return (
		<Inset tone="danger" role="region" aria-label="Danger zone">
			{/* Inset's own gap idles with a single child, so the wrapper restates
			    the internal rhythm alongside the vertical inset. */}
			<div class="flex flex-col gap-3 py-4">
				<Polymorphic
					as={tag()}
					class="flex items-center gap-1.5 text-micro font-bold uppercase tracking-widest text-danger"
				>
					<TriangleAlert class="size-3.5" aria-hidden="true" />
					Danger Zone
				</Polymorphic>
				<p class="text-callout text-ink-3">{props.description}</p>
				<div>
					<Button
						tone="danger"
						size="sm"
						onClick={props.onAction}
						disabled={props.disabled}
					>
						{props.actionLabel}
					</Button>
				</div>
			</div>
		</Inset>
	);
}

export type { DangerZoneProps };
export { DangerZone };

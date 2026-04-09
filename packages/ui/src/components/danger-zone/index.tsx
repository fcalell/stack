import { Polymorphic } from "@kobalte/core/polymorphic";
import { TriangleAlert } from "lucide-solid";
import { Button } from "#components/button";
import { Inset } from "#components/inset";
import { cn } from "#lib/cn";

type DangerZoneProps = {
	description: string;
	actionLabel: string;
	onAction: () => void;
	disabled?: boolean;
	headingLevel?: 2 | 3 | 4;
	class?: string;
};

function DangerZone(props: DangerZoneProps) {
	const tag = () => `h${props.headingLevel ?? 3}` as "h2" | "h3" | "h4";

	return (
		<Inset
			variant="error"
			class={cn("py-4", props.class)}
			role="region"
			aria-label="Danger zone"
		>
			<Polymorphic
				as={tag()}
				class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-destructive"
			>
				<TriangleAlert class="size-3.5" aria-hidden="true" />
				Danger Zone
			</Polymorphic>
			<p class="text-sm text-muted-foreground">{props.description}</p>
			<div>
				<Button
					variant="destructive"
					size="sm"
					onClick={props.onAction}
					disabled={props.disabled}
				>
					{props.actionLabel}
				</Button>
			</div>
		</Inset>
	);
}

export type { DangerZoneProps };
export { DangerZone };

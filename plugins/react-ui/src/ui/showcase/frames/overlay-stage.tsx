import { cn } from "@fcalell/ui-core/cn";
import { type ReactNode, useEffect, useState } from "react";
import { PortalContainer } from "../../lib/portal.ts";

// A stage an overlay draws inside: the popup mounts in it so it draws the
// frame's mode; `contain` stands a sheet's fixed layer in the stage's box (a
// transformed box contains its fixed descendants), which a popover anchored
// to its trigger must not take; and
// `ready` runs once the popup can mount (to open a menu, or press a blocked
// submit so its reason shows).
export function Stage(props: {
	children: ReactNode;
	contain?: boolean;
	ready?: (stage: HTMLElement) => void;
}) {
	const [stage, setStage] = useState<HTMLElement | null>(null);
	const { ready } = props;
	useEffect(() => {
		if (!stage || !ready) return;
		const run = requestAnimationFrame(() => ready(stage));
		return () => cancelAnimationFrame(run);
	}, [stage, ready]);
	return (
		<PortalContainer value={stage}>
			<div
				ref={setStage}
				className={cn(
					"relative flex flex-col overflow-hidden h-150 w-screen max-w-full rounded-card border border-edge bg-surface",
					props.contain && "transform-gpu",
				)}
			>
				{props.children}
			</div>
		</PortalContainer>
	);
}

export function press(target: Element | null | undefined): void {
	(target as HTMLElement | null | undefined)?.click();
}

export function key(target: Element | null | undefined, name: string): void {
	target?.dispatchEvent(
		new KeyboardEvent("keydown", { key: name, bubbles: true }),
	);
}

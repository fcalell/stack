import { avatar, avatarStep } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";

// A circle sized by the type role around it: the image, else the name's
// initials on a fill from the avatar ladder picked by the name, so one name
// keeps one color.
export type AvatarProps = Closed & {
	name: string;
	src?: string;
};

function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");
}

export function Avatar(props: AvatarProps) {
	return (
		<span
			role="img"
			aria-label={props.name}
			class={cn(
				avatar({ step: avatarStep(props.name) }),
				"inline-flex size-[2em] shrink-0 items-center justify-center overflow-hidden font-medium text-[0.75em]",
			)}
		>
			<Show when={props.src} fallback={initials(props.name)}>
				{(src) => <img src={src()} alt="" class="size-full object-cover" />}
			</Show>
		</span>
	);
}

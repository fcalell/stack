import { cn } from "@fcalell/ui-core/cn";
import { GATE_MARK, text, textStrong } from "@fcalell/ui-core/variants";
import { createContext, type ReactNode, use, useState } from "react";

/** The app's mark: its logo, in the light mode and, when the app gave one, the dark, and its name. */
export interface AppMark {
	/** The logo in the light mode, and in the dark when `dark` is absent. */
	src: string;
	/** The logo in the dark mode. */
	dark?: string;
	/** The app's name, drawn beside the logo. */
	name: string;
}

// The app's mark. The generated providers mount the context with the app's
// icon (`react({ icon })`) and its name; an app with no icon mounts none, so
// the Shell and the Gate draw no mark. A subtree can be scoped to none with
// `mark={null}` (a frame under an app that has an icon, drawing the bare form).
const MarkContext = createContext<AppMark | null>(null);

export function MarkProvider(props: {
	mark: AppMark | null;
	children: ReactNode;
}) {
	return <MarkContext value={props.mark}>{props.children}</MarkContext>;
}

export function useMark(): AppMark | null {
	return use(MarkContext);
}

const IMAGE = "shrink-0 object-contain";
// A mark with a dark form draws one logo per mode, each hidden under the
// other's: the theme's own `.dark` scope, not the image's media.
const LIGHT = "[.dark_&]:hidden";
const DARK = "hidden [.dark_&]:block";
const ROW = "flex items-center";
const LABEL = "truncate min-w-0";

// A logo that fails to load is gone and the name stands alone: the address
// that failed is kept, so a new `src` is tried again.
function Logo(props: { src: string; className?: string }) {
	const [failed, setFailed] = useState<string>();
	if (props.src === failed) return null;
	return (
		<img
			src={props.src}
			alt=""
			onError={() => setFailed(props.src)}
			className={cn(GATE_MARK, IMAGE, props.className)}
		/>
	);
}

/** The app's mark as one row: the logo at the avatar's size, then the name at the body role and 500, truncating. The dark form, when the app has one, is drawn under the theme's own `.dark` scope. The caller reads `useMark` first and draws no row when the app has no icon. */
export function Lockup(props: { mark: AppMark; className: string }) {
	const { mark } = props;
	return (
		<div className={cn(props.className, ROW)}>
			{mark.dark === undefined ? (
				<Logo src={mark.src} />
			) : (
				<>
					<Logo src={mark.src} className={LIGHT} />
					<Logo src={mark.dark} className={DARK} />
				</>
			)}
			<span
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					LABEL,
				)}
			>
				{mark.name}
			</span>
		</div>
	);
}

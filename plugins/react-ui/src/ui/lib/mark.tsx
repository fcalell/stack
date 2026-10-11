import { cn } from "@fcalell/ui-core/cn";
import { GATE_MARK, text, textStrong } from "@fcalell/ui-core/variants";
import { createContext, type ReactNode, use, useState } from "react";

/** The app's mark: its icon, in the light mode and, when the app gave one, the dark, and its name; and, when the app drew one, its logo (symbol and name in one image). */
export interface AppMark {
	/** The icon in the light mode, and in the dark when `dark` is absent. */
	src: string;
	/** The icon in the dark mode. */
	dark?: string;
	/** The app's drawn lockup in the light mode, and in the dark when `logoDark` is absent: drawn in place of the icon and the name. */
	logo?: string;
	/** The drawn lockup in the dark mode. */
	logoDark?: string;
	/** The app's name, drawn beside the icon, and the logo's alternative text. */
	name: string;
}

// The app's mark. The generated providers mount the context with the app's
// icon (`react({ icon })`), its drawn lockup (`react({ logo })`) and its name; an app with no icon mounts none, so
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
// A drawn lockup stands at the row's left, its own proportion kept when the
// row holds it narrower.
const DRAWN = "shrink-0 object-contain object-left";
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

// The drawn lockup carries the app's name as its alt. A pair draws one image
// per mode, the other form hidden, not removed: either failing to load leaves
// the icon and the name.
function Drawn(props: {
	src: string;
	name: string;
	size: string;
	onError: () => void;
	className?: string;
}) {
	return (
		<img
			src={props.src}
			alt={props.name}
			onError={props.onError}
			className={cn(props.size, DRAWN, props.className)}
		/>
	);
}

/** The app's mark as one row: the drawn lockup when the app has one (at the height its caller's `logo` cell gives, its width from its own proportion, held to the row, the app's name as its alt) and otherwise the icon at the avatar's size, then the name at the body role and 500, truncating. A lockup that fails to load leaves the icon and the name. The dark form, when the app has one, is drawn under the theme's own `.dark` scope. The caller reads `useMark` first and draws no row when the app has no icon. */
export function Lockup(props: {
	mark: AppMark;
	className: string;
	/** The drawn lockup's size cell: the Gate's `GATE_LOGO`, the sidebar's `SHELL_LOGO`. The plain form is the avatar's size either way. */
	logo: string;
}) {
	const { mark } = props;
	const [failed, setFailed] = useState<string>();
	if (
		mark.logo !== undefined &&
		failed !== mark.logo &&
		(mark.logoDark === undefined || failed !== mark.logoDark)
	) {
		const fail = (src: string) => () => setFailed(src);
		return (
			<div className={cn(props.className, ROW)}>
				{mark.logoDark === undefined ? (
					<Drawn
						src={mark.logo}
						name={mark.name}
						size={props.logo}
						onError={fail(mark.logo)}
					/>
				) : (
					<>
						<Drawn
							src={mark.logo}
							name={mark.name}
							size={props.logo}
							onError={fail(mark.logo)}
							className={LIGHT}
						/>
						<Drawn
							src={mark.logoDark}
							name={mark.name}
							size={props.logo}
							onError={fail(mark.logoDark)}
							className={DARK}
						/>
					</>
				)}
			</div>
		);
	}
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

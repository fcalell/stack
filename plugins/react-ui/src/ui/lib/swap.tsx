import { cn } from "@fcalell/ui-core/cn";
import { tuned } from "@fcalell/ui-core/paint";
import { rollOf, rollShift } from "@fcalell/ui-core/roll";
import { SWAP_IN, SWAP_OUT } from "@fcalell/ui-core/variants";
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

// The mark's size the new one grows from and the old one leaves toward.
const MARK_FROM = 0.6;

interface Leaving {
	id: string;
	node: ReactNode;
	shift: number;
}

/** A value that changes while shown (a mark, a figure, a label): when `id` changes the new one enters and the old one, held for the rung, leaves over it (`SWAP_IN`, `SWAP_OUT`). With `of`, its number, the old leaves and the new rises by the sign of the change (a figure rolls, in a clipped box); with `scale`, a mark grows from 0.6; with neither it is a cross-fade. It mounts at rest: a value that arrives (a waiting form's switch to its loaded one) is the settle's, never a swap. */
export function Swap(props: {
	id: string;
	of?: number;
	scale?: boolean;
	children: ReactNode;
}) {
	const { id, of, scale, children } = props;
	const [at, setAt] = useState({ id, of });
	const [leaving, setLeaving] = useState<Leaving>();
	// What the last commit drew, which is what leaves.
	const drawn = useRef<ReactNode>(children);
	useLayoutEffect(() => {
		drawn.current = children;
	});
	if (at.id !== id) {
		setAt({ id, of });
		setLeaving({
			id: at.id,
			node: drawn.current,
			shift:
				at.of !== undefined && of !== undefined
					? rollShift(rollOf(at.of, of))
					: 0,
		});
	}
	useEffect(() => {
		if (!leaving) return;
		const timer = setTimeout(() => setLeaving(undefined), tuned.fast);
		return () => clearTimeout(timer);
	}, [leaving]);
	const style = (shift: number) =>
		({
			...(shift === 0 ? {} : { "--swap-y": shift }),
			...(scale ? { "--swap-scale": MARK_FROM } : {}),
		}) as CSSProperties;
	return (
		<span
			className={cn(
				"inline-flex",
				// Positioned only while the old one leaves: at rest it must not stand
				// over a row's hit, which it would take the press from.
				leaving && "relative pointer-events-none",
				of !== undefined && "overflow-clip",
			)}
		>
			{leaving ? (
				<span
					key={`out-${leaving.id}`}
					aria-hidden
					style={style(leaving.shift)}
					className={cn("absolute inset-0 inline-flex", SWAP_OUT)}
				>
					{leaving.node}
				</span>
			) : null}
			<span
				key={id}
				style={style(leaving?.shift ?? 0)}
				className={cn("inline-flex", leaving && SWAP_IN)}
			>
				{children}
			</span>
		</span>
	);
}

/** A figure that rolls when its number changes while shown (`rollOf`): `text` is what it reads, `of` the number it is. A clock's tick is no `Roll`: it switches at once. */
export function Roll(props: { text: string; of: number }) {
	return (
		<Swap id={props.text} of={props.of}>
			{props.text}
		</Swap>
	);
}

import type { Accessor, JSX } from "solid-js";
import {
	createContext,
	createSignal,
	createUniqueId,
	onCleanup,
	useContext,
} from "solid-js";

// ─── Types ───

type OverlayEntry = {
	id: string;
	component: () => JSX.Element;
};

type OverlayContextValue = {
	register: (entry: OverlayEntry) => void;
	unregister: (id: string) => void;
};

type OverlayRenderState<P, R> = {
	isOpen: Accessor<boolean>;
	handleOpenChange: (open: boolean) => void;
	state: Accessor<{ props: P; resolve: (r: R | undefined) => void } | null>;
	close: (result?: R) => void;
};

// ─── Context factory ───

function createOverlayContext(name: string) {
	const Context = createContext<OverlayContextValue>();

	function useCtx() {
		const ctx = useContext(Context);
		if (!ctx) {
			throw new Error(`create${name} must be used within a <${name}.Provider>`);
		}
		return ctx;
	}

	return { Context, useCtx };
}

// ─── Provider state ───

function createProviderState() {
	const [entries, setEntries] = createSignal<OverlayEntry[]>([]);

	const context: OverlayContextValue = {
		register(entry) {
			setEntries((prev) => [...prev, entry]);
		},
		unregister(id) {
			setEntries((prev) => prev.filter((e) => e.id !== id));
		},
	};

	return { entries, context };
}

// ─── Overlay hook ───

function createOverlayHook<P = void, R = undefined>(
	ctx: OverlayContextValue,
	renderComponent: (state: OverlayRenderState<P, R>) => JSX.Element,
): { open: (props: P) => Promise<R | undefined> } {
	const id = createUniqueId();

	const [isOpen, setIsOpen] = createSignal(false);
	const [overlayState, setOverlayState] = createSignal<{
		props: P;
		resolve: (r: R | undefined) => void;
	} | null>(null);

	let pendingResult: R | undefined;

	function close(result?: R) {
		if (!overlayState()) return;
		pendingResult = result;
		setIsOpen(false);
	}

	function open(props: P): Promise<R | undefined> {
		return new Promise<R | undefined>((resolve) => {
			pendingResult = undefined;
			setOverlayState({ props, resolve });
			setIsOpen(true);
		});
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			const current = overlayState();
			if (current) {
				setOverlayState(null);
				current.resolve(pendingResult);
			}
		}
	}

	ctx.register({
		id,
		component: () =>
			renderComponent({ isOpen, handleOpenChange, state: overlayState, close }),
	});

	onCleanup(() => {
		const current = overlayState();
		if (current) {
			setOverlayState(null);
			current.resolve(undefined);
		}
		ctx.unregister(id);
	});

	return { open };
}

// ─── Exports ───

export type { OverlayContextValue, OverlayEntry, OverlayRenderState };
export { createOverlayContext, createOverlayHook, createProviderState };

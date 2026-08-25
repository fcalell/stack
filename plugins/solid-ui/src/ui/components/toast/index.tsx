import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { Toaster as SolidSonnerToaster, toast } from "solid-sonner";

// A denylist against a third-party type: solid-sonner's `class`, `className`,
// `style` and its `toastOptions` / `icons` design-overwrite slots are omitted,
// and the behavioral props keep flowing through the spread. An upgrade adding
// a new styling prop reopens this silently; the look-adjacent residue that
// stays open (`richColors`, `invert`, `theme`, mostly neutered by the forced
// `unstyled`) is accepted and recorded.
type ToasterProps = Omit<
	ComponentProps<typeof SolidSonnerToaster>,
	"class" | "className" | "style" | "toastOptions" | "icons"
> & {
	class?: never;
	style?: never;
	classList?: never;
};

function Toaster(props: ToasterProps) {
	const [local, rest] = splitProps(props, ["theme", "position"]);

	return (
		<SolidSonnerToaster
			theme={local.theme ?? "dark"}
			position={local.position ?? "top-right"}
			style={{ "font-family": "var(--font-mono)" }}
			toastOptions={{
				unstyled: true,
				style: {
					padding: "16px",
					background: "var(--color-surface)",
					border: "2px solid var(--color-edge)",
					color: "var(--color-ink-1)",
					"font-family": "inherit",
				},
				classes: {
					toast:
						"focus-visible:outline-2 focus-visible:outline-interactive focus-visible:outline-offset-2",
					success: "!border-l-[3px] !border-l-ok",
					error: "!border-l-[3px] !border-l-danger",
					warning: "!border-l-[3px] !border-l-warn",
					info: "!border-l-[3px] !border-l-ink-1",
					closeButton:
						"bg-surface border-edge text-ink-3 hover:bg-surface-2 hover:text-ink-1",
				},
			}}
			{...rest}
		/>
	);
}

export type { ToasterProps };
export { Toaster, toast };

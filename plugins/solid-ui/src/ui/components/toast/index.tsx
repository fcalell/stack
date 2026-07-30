import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { Toaster as SolidSonnerToaster, toast } from "solid-sonner";

type ToasterProps = ComponentProps<typeof SolidSonnerToaster>;

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
					background: "var(--color-card)",
					border: "2px solid var(--color-border)",
					color: "var(--color-foreground)",
					"font-family": "inherit",
				},
				classes: {
					toast: "focus-visible:[box-shadow:0_0_0_2px_var(--color-ring)]",
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

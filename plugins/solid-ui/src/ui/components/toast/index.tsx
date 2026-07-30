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

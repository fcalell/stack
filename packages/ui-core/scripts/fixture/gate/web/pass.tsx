const base = cn("flex", "gap-stack");
const look = "bg-canvas text-ink-1";
const page = () => (
	<div class="flex-1 items-center">
		<div class={cn("flex-col gap-row", open && "justify-between", open ? "grow" : "shrink-0")}>
			<span class={["overflow-hidden", { "flex-wrap": wide, relative: true }, cn("z-10")]} />
			<span class={look} />
			<span class={props.class} />
			<span class={`h-${size}`} />
			<span class={merge("bg-canvas")} />
			<span class={ui.cn("bg-canvas")} />
			<section classList={{ "items-start": open, flex: true }} />
			<Header title={base} />
		</div>
	</div>
);

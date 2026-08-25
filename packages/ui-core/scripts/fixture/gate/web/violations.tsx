const row = cn("flex-row", "text-ink-3");
const page = () => (
	<div class="flex-1 bg-canvas">
		<div class={cn("text-ink-2", open && "truncate", open ? "p-card" : "gap-4")}>
			<span class={cn(["mx-auto"], { "font-bold": open, sticky: true }, cn("underline"))} />
			<span class="w-[104px] bg-(--x) hover:flex" />
			<span class={`shadow-2`} />
			<span class={cn(open || "rounded-lg")} />
			<section classList={{ "text-sm": open, hidden: true }} />
		</div>
	</div>
);

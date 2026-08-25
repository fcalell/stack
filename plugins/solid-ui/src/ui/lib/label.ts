// ─── Shared style constants ───

// The label look. `Label` renders it alone; `Field.Label` composes the same
// base under its own field-state lines, so no class crosses a component
// boundary. `micro` carries the eyebrow tracking; leading rides the role.
export const labelClass =
	"flex flex-row items-center gap-2 text-micro font-bold uppercase tracking-widest text-ink-3 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50";

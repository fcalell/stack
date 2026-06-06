// Converts a kebab-case plugin slug (e.g. "solid-ui", "native-ui") into the
// camelCase factory/identifier name the config + scaffolding emit ("solidUi").
// Digit-aware so a slug like "plugin-2d" maps to a valid identifier ("plugin2d")
// rather than leaving a stray hyphen. This is the single source of truth for the
// slug→identifier transform — config writing, discovery, and scaffolding all
// share it so they can never drift.
export function toCamelCase(name: string): string {
	return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

// PascalCase variant for type names derived from a slug ("widget" -> "Widget",
// "my-widget" -> "MyWidget").
export function toPascalCase(name: string): string {
	const camel = toCamelCase(name);
	return camel.charAt(0).toUpperCase() + camel.slice(1);
}

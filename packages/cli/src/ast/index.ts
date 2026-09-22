// Public surface for @fcalell/cli/ast.
// Spec types + printers for TypeScript/TSX, TOML, and HTML generated files.

export { literalToProps } from "./build.ts";
export { renderHtml } from "./html-printer.ts";
export { dedupeImports } from "./imports.ts";
export type {
	HtmlDocument,
	HtmlInjection,
	MiddlewareSpec,
	ProviderSpec,
	ScaffoldSpec,
	TomlDocument,
	TomlValue,
	TsExpression,
	TsImportSpec,
	TsJsxExpression,
	TsSourceFile,
	TsStatement,
	TsTypeRef,
} from "./specs.ts";
export { renderToml } from "./toml-printer.ts";
export { renderTsSourceFile } from "./ts-printer.ts";

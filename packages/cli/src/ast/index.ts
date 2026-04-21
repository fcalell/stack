// Public surface for @fcalell/cli/ast.
// Spec types + printers for TypeScript/TSX, TOML, and HTML generated files.

export {
	arr,
	arrow,
	asExpr,
	bool,
	call,
	id,
	importDefault,
	importNamed,
	importNamespace,
	importSideEffect,
	jsx,
	literal,
	literalToProps,
	mem,
	newExpr,
	nul,
	num,
	obj,
	str,
	undef,
} from "#ast/build";
export { renderHtml } from "#ast/html-printer";
export { dedupeImports } from "#ast/imports";
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
} from "#ast/specs";
export { renderToml } from "#ast/toml-printer";
export { renderTsSourceFile } from "#ast/ts-printer";

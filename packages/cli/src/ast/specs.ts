// Spec types for the @fcalell/cli/ast surface.
// These are the typed inputs consumed by the TS/TSX, TOML, and HTML printers.
// All types are pure declarations — no runtime logic lives in this file.

export type TsImportSpec =
	| { source: string; default: string; typeOnly?: boolean }
	| {
			source: string;
			named: Array<string | { name: string; alias: string }>;
			typeOnly?: boolean;
	  }
	| { source: string; namespace: string }
	| { source: string; sideEffect: true };

export type TsExpression =
	| { kind: "string"; value: string }
	| { kind: "number"; value: number }
	| { kind: "boolean"; value: boolean }
	| { kind: "null" }
	| { kind: "undefined" }
	| { kind: "identifier"; name: string }
	| { kind: "member"; object: TsExpression; property: string }
	| {
			kind: "call";
			callee: TsExpression;
			args: TsExpression[];
			typeArgs?: TsTypeRef[];
	  }
	| { kind: "new"; callee: TsExpression; args: TsExpression[] }
	| {
			kind: "object";
			properties: Array<{
				key: string;
				value: TsExpression;
				shorthand?: boolean;
			}>;
	  }
	| { kind: "array"; items: TsExpression[] }
	| {
			kind: "arrow";
			params: Array<{ name: string; type?: TsTypeRef }>;
			body: TsExpression | TsStatement[];
			async?: boolean;
	  }
	| { kind: "as"; expression: TsExpression; type: TsTypeRef }
	| {
			kind: "jsx";
			tag: string;
			props: Array<{ name: string; value?: TsExpression }>;
			children: Array<TsExpression | { kind: "text"; value: string }>;
			selfClosing?: boolean;
	  }
	| { kind: "jsx-fragment"; children: TsExpression[] }
	| { kind: "template"; parts: Array<string | TsExpression> };

export type TsTypeRef =
	| { kind: "reference"; name: string; args?: TsTypeRef[] }
	| { kind: "literal"; value: string | number | boolean }
	| { kind: "union"; types: TsTypeRef[] }
	| { kind: "intersection"; types: TsTypeRef[] }
	| {
			kind: "object";
			members: Array<{
				name: string;
				type: TsTypeRef;
				optional?: boolean;
				readonly?: boolean;
			}>;
	  }
	| { kind: "array"; element: TsTypeRef }
	| { kind: "tuple"; elements: TsTypeRef[] }
	| {
			kind: "function";
			params: Array<{ name: string; type: TsTypeRef }>;
			returnType: TsTypeRef;
	  };

export type TsStatement =
	| {
			kind: "const";
			name: string;
			value: TsExpression;
			type?: TsTypeRef;
			exported?: boolean;
	  }
	| {
			kind: "let";
			name: string;
			value?: TsExpression;
			type?: TsTypeRef;
			exported?: boolean;
	  }
	| { kind: "export-default"; value: TsExpression }
	| { kind: "export-type"; name: string; type: TsTypeRef }
	| { kind: "export-type-ref"; source: string; names: string[] }
	| {
			kind: "interface";
			name: string;
			members: Array<{ name: string; type: TsTypeRef; optional?: boolean }>;
			extends?: string[];
			exported?: boolean;
	  }
	| { kind: "expression"; value: TsExpression };

export type TsSourceFile = {
	imports: TsImportSpec[];
	statements: TsStatement[];
	// Optional file-level directives / banner comments go here if ever needed.
};

// ── TOML ────────────────────────────────────────────────────────────

export type TomlValue =
	| string
	| number
	| boolean
	| TomlValue[]
	| { [key: string]: TomlValue };

export type TomlDocument = {
	root: Record<string, TomlValue>;
	tables: Array<{ path: string[]; entries: Record<string, TomlValue> }>;
	arrayTables: Array<{ path: string[]; entries: Record<string, TomlValue> }>;
};

// ── HTML ────────────────────────────────────────────────────────────

export type HtmlInjection =
	| {
			kind: "script";
			src: string;
			type?: "module" | "text/javascript";
			async?: boolean;
			defer?: boolean;
	  }
	| {
			kind: "link";
			rel: string;
			href: string;
			as?: string;
			crossorigin?: string;
	  }
	| { kind: "meta"; name?: string; property?: string; content: string }
	| { kind: "title"; value: string }
	| { kind: "html-attr"; name: string; value: string };

export type HtmlDocument = {
	shellSource: URL; // template on disk
	head: HtmlInjection[];
	bodyEnd: HtmlInjection[];
};

// ── Scaffold ────────────────────────────────────────────────────────

export type ScaffoldSpec = {
	source: URL; // file:// URL to template on disk
	target: string; // cwd-relative path
	plugin: string; // plugin that contributed this scaffold (for attribution)
};

// ── Composition ─────────────────────────────────────────────────────

// Only JSX-shaped expressions are valid children of the composed providers
// tree. Allowing arbitrary TsExpression (e.g. string/number literals) would
// emit nonsense output like `<MetaProvider>{props.children}"hi"</MetaProvider>`.
export type TsJsxExpression = Extract<
	TsExpression,
	{ kind: "jsx" } | { kind: "jsx-fragment" }
>;

export type ProviderSpec = {
	imports: TsImportSpec[];
	wrap: {
		identifier: string;
		props?: Array<{ name: string; value: TsExpression }>;
	};
	siblings?: TsJsxExpression[]; // JSX elements rendered alongside
	order: number; // lower = outer wrapper
};

export type MiddlewareSpec = {
	imports: TsImportSpec[];
	call: TsExpression; // must be a call expression
	phase: "before-cors" | "after-cors" | "before-routes" | "after-routes";
	order: number;
};

// CSS escape policy for the solid-ui codegen.
//
// The escape/validation primitives are a shared security boundary — see
// `@fcalell/cli/css`. This thin layer only stamps the plugin label into error
// messages so a thrown error points at solid-ui's input, and re-exports the
// full set this plugin's codegen uses (string/url/ident/supports).
import {
	cssIdent as cssIdentBase,
	cssString,
	cssSupportsExpression as cssSupportsExpressionBase,
	cssTokenValue as cssTokenValueBase,
	cssUrl as cssUrlBase,
	cssVarName as cssVarNameBase,
	isCssIdent,
	isCssSupportsExpression,
} from "@fcalell/cli/css";

const LABEL = "plugin-solid-ui";

export { cssString, isCssIdent, isCssSupportsExpression };

export const cssUrl = (value: string): string => cssUrlBase(value, LABEL);
export const cssIdent = (value: string): string => cssIdentBase(value, LABEL);
export const cssSupportsExpression = (value: string): string =>
	cssSupportsExpressionBase(value, LABEL);
export const cssVarName = (value: string): string =>
	cssVarNameBase(value, LABEL);
export const cssTokenValue = (value: string): string =>
	cssTokenValueBase(value, LABEL);

// A declaration's property name. `@theme` carries only custom properties, but
// a `@utility` body and the mode block also carry plain CSS properties
// (`box-shadow`, `color-scheme`), which are <ident>s and not custom-property
// names. Both spellings cross the same render boundary.
export const cssProperty = (value: string): string =>
	value.startsWith("--") ? cssVarName(value) : cssIdent(value);

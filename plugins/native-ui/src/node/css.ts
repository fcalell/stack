// CSS escaping/validation for the native-ui `global.css` codegen.
//
// The escape/validation primitives are a shared security boundary — see
// `@fcalell/cli/css`. This thin layer only stamps the plugin label into error
// messages so a thrown error points at native-ui's input.
import {
	cssIdent as cssIdentBase,
	cssString,
	cssTokenValue as cssTokenValueBase,
	cssVarName as cssVarNameBase,
	isCssIdent,
} from "@fcalell/cli/css";

const LABEL = "plugin-native-ui";

export { cssString, isCssIdent };

export const cssIdent = (value: string): string => cssIdentBase(value, LABEL);
export const cssVarName = (value: string): string =>
	cssVarNameBase(value, LABEL);
export const cssTokenValue = (value: string): string =>
	cssTokenValueBase(value, LABEL);

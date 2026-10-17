// Stack's UI packages ship TypeScript source that a consumer installs under
// `node_modules` (pnpm nests them as `.pnpm/@fcalell+<pkg>@.../node_modules/
// @fcalell/<pkg>`). Two filters keep them out of the React Compiler's reach by
// default, and both are widened to let `@fcalell` packages through while every
// other dependency stays out: `@vitejs/plugin-react` leaves every
// `/node_modules/` path out of Babel (`exclude`), and the compiler skips any
// filename holding `node_modules` (`sources`, a positive test, so it is the
// same pattern wrapped in a negative lookahead). plugin-react's Vite config and
// plugin-expo's `babel.config.cjs` both read it, so the web and the phone
// compile the same code. Internal: not a documented surface.
export const OTHER_DEPENDENCY =
	"/node_modules/(?!\\.pnpm/@fcalell\\+|@fcalell/)";
export const COMPILED_SOURCE = `^(?:(?!${OTHER_DEPENDENCY}).)*$`;

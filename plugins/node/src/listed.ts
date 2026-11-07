/**
 * Whether a file of a directory is a module `loadModules` lists, by name without the extension. A
 * test, a declaration and an `index` are not modules. The one rule `loadModules` (at run time) and
 * the bundle (at build) both apply.
 */
export function isListedModule(file: string): boolean {
	return (
		/\.(ts|mts)$/.test(file) &&
		!/\.d\.m?ts$/.test(file) &&
		!/\.test\.m?ts$/.test(file) &&
		!/^index\.m?ts$/.test(file)
	);
}

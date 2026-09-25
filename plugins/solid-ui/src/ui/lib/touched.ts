import { type Accessor, createContext, useContext } from "solid-js";

// A `Form` or a `Sheet` is touched once a field inside it takes input. A
// blocked act inside says its reason from then on, or once it is tapped;
// before either it is disabled and silent, so an untouched form opens with
// no reproach under its act.
export const TouchedContext = createContext<Accessor<boolean>>(() => false);

export function useTouched(): Accessor<boolean> {
	return useContext(TouchedContext);
}

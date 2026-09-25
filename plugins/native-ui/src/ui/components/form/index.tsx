import { createContext, type ReactNode, useContext, useState } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { TouchedContext } from "../../lib/touched";

export interface FormProps extends Closed {
	onSubmit: () => void;
	children?: ReactNode;
}

const FormContext = createContext<(() => void) | undefined>(undefined);

// Fields at `stack`; its ActionBar last and in flow, so it scrolls with the
// fields and the keyboard never covers it. A blocked act inside says its
// reason once a field has taken input.
export function Form({ onSubmit, children }: FormProps) {
	const [touched, setTouched] = useState(false);
	return (
		<FormContext.Provider value={onSubmit}>
			<TouchedContext.Provider
				value={{ touched, touch: () => setTouched(true) }}
			>
				<View className="gap-stack">{children}</View>
			</TouchedContext.Provider>
		</FormContext.Provider>
	);
}

export function useFormSubmit(): (() => void) | undefined {
	return useContext(FormContext);
}

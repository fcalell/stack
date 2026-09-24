import { createContext, type ReactNode, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";

export interface FormProps extends Closed {
	onSubmit: () => void;
	children?: ReactNode;
}

const FormContext = createContext<(() => void) | undefined>(undefined);

// Fields at `stack`; its ActionBar last and in flow, so it scrolls with the
// fields and the keyboard never covers it.
export function Form({ onSubmit, children }: FormProps) {
	return (
		<FormContext.Provider value={onSubmit}>
			<View className="gap-stack">{children}</View>
		</FormContext.Provider>
	);
}

export function useFormSubmit(): (() => void) | undefined {
	return useContext(FormContext);
}

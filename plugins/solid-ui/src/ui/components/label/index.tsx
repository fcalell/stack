import { Polymorphic, type PolymorphicProps } from "@kobalte/core/polymorphic";
import type { ValidComponent } from "solid-js";
import { labelClass } from "#lib/label";

type LabelProps = {
	class?: never;
	style?: never;
	classList?: never;
};

function Label<T extends ValidComponent = "label">(
	props: PolymorphicProps<T, LabelProps>,
) {
	return <Polymorphic as="label" class={labelClass} {...props} />;
}

export type { LabelProps };
export { Label };

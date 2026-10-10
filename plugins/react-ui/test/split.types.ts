import type { ScreenProps } from "../src/ui/components/screen/index.tsx";
import type { SplitProps } from "../src/ui/components/split/index.tsx";

// a Split takes the record its main opened beside it, a Screen whose back is the main's route
{
	const job: ScreenProps = { title: "Job 12", back: "/items/12" };
	const split: SplitProps = { list: null, main: "Item 12", beside: job.title };
	void split;
}

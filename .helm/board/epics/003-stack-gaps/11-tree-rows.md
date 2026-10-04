---
id: 003-11
status: backlog
sessions: {}
---
# ui-core: rows stand at a depth on a rail and fold under their parent

## Goal
Martechthings draws a branching journey as a step list: a choice point's options head legs indented under it, nested choice points step in again, and expectations sit under each step. `ListRow` has no depth or rail, and `OptionList` indents only a checked option's children.

## Approach
- References: LangChain's trace tree, ≈ 19 px per level with a hairline rail per level and a fold chevron per parent ([screen](https://mobbin.com/screens/8ff4a744-6e6e-46ef-a671-90ff0201b0dc)); Attio's If / else panel, option chips with the next step indented on a connector ([screen](https://mobbin.com/screens/440a5600-7725-417e-a6c2-6913adce5f8a)); Postman's run results, checks nested under each step on a rail ([screen](https://mobbin.com/screens/f009c86c-c5df-4f73-9ea6-c3b14cd0e3b4)).

## Acceptance criteria
- [ ] Rows draw at a depth with a hairline rail per level, and a parent folds its children.
- [ ] Three levels leave a row's title readable in a Split main beside the list.

## Open questions
- [ ] A `ListRow` depth or a tree component: the stack session decides.

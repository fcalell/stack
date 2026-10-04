---
id: 003-25
status: backlog
sessions: {}
---
# ui-core: a row shows a step list while its act pends

## Goal
A Martechthings import runs on its row: while it pends, the row's meta becomes the import's step list, the other rows staying usable. `PendingBar` is one sentence in an `ActionBar`'s place, and the loading-and-pending step list has no component.

## Approach
- References: Neon's import step running its check inside the card ([screen](https://mobbin.com/screens/82420934-9c74-4d7e-a7f8-da5a495b922b)); Apollo's in-progress track on its row ([screen](https://mobbin.com/screens/54e2f7be-0e03-4874-9790-6e7bda548de1)).

## Acceptance criteria
- [ ] A row draws the loading-and-pending step list while its act waits, the active step spinning.

# Auth callbacks

`src/worker/plugins/auth.ts` holds the code auth runs for you: sending a code, an invitation, a
deletion link. `stack init` and `stack add auth` scaffold it; the generated worker imports it.

```ts
// src/worker/plugins/auth.ts
import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

const callbacks: AuthCallbacks<Env> = {
  async sendOTP({ email, code, type, env }) {
    // send code to email through a binding or a secret on env; type says why
  },
  async sendInvitation({ invitationId, email, organization, inviter, env }) {
    const url = `${env.APP_URL}/invitations/${invitationId}`;
    // send url to email, naming inviter.name and organization.name
  },
};

export default callbacks;
```

Every payload carries `env`, the request's env, so a callback reaches a binding or a secret
through it. `AuthCallbacks<Env>` types it with the worker's `Env`; bare `AuthCallbacks` leaves it
`unknown`.

| Callback | Runs when |
| --- | --- |
| `sendOTP` | A one-time code is issued. `type` is `sign-in`, `email-verification`, `forget-password` or `change-email` (`OtpType`). Required while `emailOtp` is on |
| `sendInvitation` | An organization invitation is sent. It carries `invitationId` (what the accept link names), `role`, `organization` (`id`, `name`, `slug`) and `inviter` (`id`, `name`, `email`). An invitation expires after 48 hours |
| `generateOTP` | A code is about to be generated. Return a string to fix it (a review account's code), `undefined` for a random one. Synchronous |
| `beforeDelete` | `user.deleteUser` is on and an account is about to go. Throw to refuse; clean up storage and personal data here |
| `sendDeleteVerification` | `user.deleteUser` is on: `deleteUser()` emails `url` instead of deleting, and the account goes when the link opens, with no fresh session needed. Implement it in a passwordless app |

## Rules

- Import only `@fcalell/plugin-auth/runtime` here, never the package root: the file is bundled
  into the worker, and the root drags in the plugin's Node-only codegen.
- With `emailOtp` on, a missing file fails `stack generate`, and a file without `sendOTP` makes
  the worker refuse to start auth. With `emailOtp: false` the file is optional.
- Key a `generateOTP` override on `type` as well as `email`: it runs for every code type.
- Without `sendDeleteVerification`, deletion needs a session younger than `session.freshAge`;
  never set `freshAge: 0` to get around it.

## A sign-in flow of your own

A flow auth does not ship (a one-time link, an enrolment token) is a Better Auth plugin you write
and list on `plugins`. It registers after auth's own, under `/api/auth`. A table it declares lives
in `src/schema/index.ts`, exported under the plugin's model name.

```ts
const callbacks: AuthCallbacks<Env> = {
  sendOTP({ email, code }) { /* ... */ },
  plugins: [enrolmentLink()],
};
```

Before writing one, check [sign-in](./sign-in.md): a flow every app needs is a gap in stack, filed
by the cli's gap recipe (`node_modules/@fcalell/cli/guide/gap.md`).

**Check:** `stack generate`, then `pnpm check` passes, and under `pnpm dev` a sign-in code
reaches `sendOTP`.

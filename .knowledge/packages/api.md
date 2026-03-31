# @fcalell/api

Reusable Hono middleware and oRPC utilities for Cloudflare Workers.

**Stack:** Hono + oRPC + Zod

## Usage

```ts
import { rateLimiter } from "@fcalell/api/middleware/rate-limit"
import { authMiddleware } from "@fcalell/api/middleware/auth"
```

## Middleware

<!-- Middleware catalog will be populated during migration from @repo/api -->

## Conventions

- Middleware exports are factory functions that accept configuration
- All middleware is Cloudflare Workers compatible (no Node.js APIs)
- Validation uses Zod schemas

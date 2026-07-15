# Decisions Log

## Stage 1.1 — Auth module

- **`register()` behavior**: always creates a **brand-new tenant** with the
  caller as `RESTAURANT_OWNER`. It does **not** support joining an existing
  tenant as staff — that must go through a separate, authenticated,
  permission-checked "invite user" endpoint (not built yet). Rationale:
  letting an anonymous `/auth/register` call join an arbitrary existing
  tenant by supplying its `tenantSlug` would let anyone self-enroll into
  someone else's restaurant.
- **Refresh token storage**: refresh tokens are opaque JWTs whose **SHA-256
  hash** is stored in `Session.refreshToken` (not bcrypt) so a session can be
  looked up by exact match in O(1); bcrypt is reserved for the user's
  password since that needs salted, slow hashing, not indexed lookups.
  Refresh is **rotating**: each `/auth/refresh` call deletes the old session
  row and issues a brand-new access/refresh pair + session.
- **`logout-all` IDOR fix**: the endpoint no longer trusts a `userId` in the
  request body. It defaults to the authenticated caller's own id; a
  different `userId` is only honored if the caller's role is `SUPER_ADMIN`
  (`AuthService.assertCanLogoutAll`).
- **Login error messages**: identical `UnauthorizedException` message
  regardless of whether the tenant, the user, or the password was wrong —
  prevents tenant/user enumeration.

## Stage 1.2 — Tailwind v4

Chose **(أ) real upgrade to v4** (not downgrade to v3.4), since the
dependency was already pinned to `^4.1.0`. To avoid rewriting the whole
color/token system into `@theme` CSS blocks right now, `globals.css` uses
v4's `@config "../../tailwind.config.ts"` compatibility directive to keep
loading the existing JS config as-is (brand colors, radii, keyframes, the
`tailwindcss-animate` plugin). `postcss.config.mjs` now uses
`@tailwindcss/postcss` (added to `apps/web/package.json`) instead of calling
`tailwindcss` directly, which v4 requires.

Follow-up (optional, not required for the build to pass): migrate
`tailwind.config.ts`'s `theme.extend` into a native `@theme` block in
`globals.css` to drop the JS config entirely — v4's intended long-term
pattern.

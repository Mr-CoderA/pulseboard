# RF-2

# Navigate to `/atlas` after login and register

## Scope

Pulseboard’s static SvelteKit app currently stays on the auth forms after a successful POST. [`app/src/routes/auth/login/+page.svelte`](app/src/routes/auth/login/+page.svelte) sets `notice` to `"Session accepted. Continue to a workspace floor."`; [`app/src/routes/auth/register/+page.svelte`](app/src/routes/auth/register/+page.svelte) sets `notice` to `"Member created. Sign in when you are ready to file."`. Neither file imports `$app/navigation` or calls `goto`.

The API already establishes the session on both endpoints: [`backend/src/routes/auth.ts`](backend/src/routes/auth.ts) `registerAuthRoutes` returns `jsonResult(201, { token }, sessionCookieHeader(...))` for register and `jsonResult(200, ...)` for login. [`app/src/lib/api/client.ts`](app/src/lib/api/client.ts) `HttpApiClient.send` uses `credentials: "include"` and does not persist `AuthTokenResponse.token` (optional `token` on `createApiClient` is unused by the auth pages).

The only prerendered workspace floor is Atlas. [`app/src/lib/routes/manifest.ts`](app/src/lib/routes/manifest.ts) defines `PREVIEW_WORKSPACES` as `["atlas"]`, `workspaceCoverPath(slug)` as `` `/${slug}` ``, and `prerenderEntriesFor("atlas")` starting with `/atlas`. Destination for post-auth navigation is that cover path, not dashboard/standup.

**In scope:** client navigation after successful login and register; keep error alerts; drop success-only notices that contradict leaving the page (especially register’s “sign in when ready”). **Out of scope:** backend cookie/JWT changes, storing the token body, extra sign-in after register, new Docker/Postgres, restyling the existing editorial auth rail/canvas.

**Security (material, cookie session):** Do not write the JSON `token` to `localStorage`, component state used for later Bearer calls, or a non-HttpOnly cookie. Session remains `pulseboard_session` as set by the API. Failed requests must not navigate.

## Files to change

- [`app/src/lib/routes/manifest.ts`](app/src/lib/routes/manifest.ts) — export a single post-auth path derived from the existing preview table (do not import `$app/navigation` here; this module is used by Node tests and `entries()`).
- [`app/src/routes/auth/login/+page.svelte`](app/src/routes/auth/login/+page.svelte) — `goto` after successful `client.login`; remove success `notice`.
- [`app/src/routes/auth/register/+page.svelte`](app/src/routes/auth/register/+page.svelte) — same after `client.register`; treat register as an authenticated entry (cookie already set).
- [`app/test/static-routes.test.ts`](app/test/static-routes.test.ts) — assert the destination is the Atlas cover and that both auth sources navigate instead of showing the old success copy.

Do not change [`app/src/lib/api/client.ts`](app/src/lib/api/client.ts), [`backend/src/routes/auth.ts`](backend/src/routes/auth.ts), or cookie serialization in [`backend/src/auth/cookies.ts`](backend/src/auth/cookies.ts).

## Implementation steps

What makes this distinctive: the landing URL is not a magic string and not “whatever the home page is.” It is the same cover the static adapter already prerenders, taken from `workspaceCoverPath(PREVIEW_WORKSPACES[0])` so auth success and the Atlas floor cannot drift. Register is not a half-auth that dumps the member back to login copy; it uses the same floor entry as login because the 201 response already attaches the session cookie.

1. **Canonical destination in the route table**  
   In `manifest.ts`, next to `AUTH_PATHS` / `workspaceCoverPath`, export something equivalent to:

   `export const POST_AUTH_PATH = workspaceCoverPath(PREVIEW_WORKSPACES[0]);`

   That evaluates to `/atlas`. Keep `PREVIEW_WORKSPACES[0]` as the slug source so a future preview slug change updates auth landing with the prerender table.

2. **Login submit: navigate only after 200 from `client.login`**  
   In `login/+page.svelte`:
   - Import `goto` from `$app/navigation` and `POST_AUTH_PATH` from `$lib/routes/manifest`.
   - Keep the existing `try` / `catch` / `finally` around `pending`.
   - On success: `await client.login({ email: email.trim(), password })` then `await goto(POST_AUTH_PATH)`. Do not assign `notice`. Do not pass the returned token into `createApiClient` or any store.
   - On failure: keep `error = cause instanceof Error ? cause.message : "Sign-in was rejected."` and the `{#if error}` `<p class="alert" role="alert">`. Do not call `goto`.
   - Remove the `notice` state and the `{#if notice}` status paragraph (success is leaving the page; a flash of “Session accepted…” is the bug the ticket describes).
   - Leave the editorial layout as-is: `rail` / `auth-frame` / `Typography` display + lede, existing field and button classes. Do not add gradient panels, shadowed cards, or a post-success interstitial.

3. **Register submit: same floor, no second sign-in**  
   Mirror login in `register/+page.svelte` with `await client.register(...)` then `await goto(POST_AUTH_PATH)`. Keep the register-specific fallback `"Registration was rejected."` and the existing error alert. Remove the success notice that tells the user to sign in later (that copy is false once the cookie is set). Do not change validation (`minlength="8"`, `maxlength="128"`) or the lede that the page does not invent a token.

4. **Tests that match this repo’s style**  
   In `static-routes.test.ts`, read both auth `+page.svelte` files (same `readFileSync` pattern already used for `+layout.ts` and `svelte.config.js`). Assert:
   - Both sources import `$app/navigation` and call `goto` with `POST_AUTH_PATH` (or an equivalent that still resolves to `/atlas`).
   - Neither source contains `"Session accepted. Continue to a workspace floor."` or `"Member created. Sign in when you are ready to file."`.
   - `POST_AUTH_PATH` (or `workspaceCoverPath(PREVIEW_WORKSPACES[0])`) equals `/atlas` and remains in `STATIC_PRERENDER_PATHS` / `prerenderEntriesFor("atlas")`.
   - Error-alert markup (`role="alert"`) remains on both forms.

   Do not add Playwright or a live API. App tests are Node `tsx --test` files listed in [`app/package.json`](app/package.json) `test`; add the new assertions to the existing `static-routes` file rather than a new runner.

5. **Lint / types**  
   Auth pages are prerendered (`export const prerender = true` in each `+page.ts`). `goto` runs only in the submit handler (browser). Do not import `$app/navigation` from `manifest.ts`.

## Validation and acceptance

From the repository root (authoritative; no database required):

```sh
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Package-level app tests (included in turbo `test` / app `build`): `npm test --workspace=@pulseboard/app`.

**Acceptance**

- Successful sign-in: form does not remain with a status message; client navigates to `/atlas`.
- Successful register: same navigation; user is not told to sign in again; cookie session is unchanged (client still does not store the token body).
- Failed login/register: stay on the form; existing `role="alert"` error path still works.
- `/atlas` remains the prerendered workspace cover from `PREVIEW_WORKSPACES`.

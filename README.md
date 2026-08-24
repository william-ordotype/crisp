# Crisp Loader for Memberstack

A script that integrates Crisp chat with Memberstack authentication, automatically passing user data to Crisp sessions.

## Features

- Loads the Crisp chat widget lazily (first interaction or 5s idle), only for logged-in members or anonymous visitors with analytics consent (`fs-cc` cookie)
- Skips browsers that cannot run Crisp's own bundle (no regex lookbehind, typically Safari < 16.4; no ES2020 syntax, typically Chrome < 80) and reports one titled error per cohort as an unhandled promise rejection, which reaches Sentry from Safari as well as Chrome, so the affected-user count stays clean
- Extracts Memberstack member ID and email from localStorage
- Pushes user data to Crisp when chat is opened or a message is sent

## Usage

The file is served raw through jsDelivr. Add this tag to the Webflow page footer, after Memberstack:

```html
<script defer crossorigin="anonymous" src="https://cdn.jsdelivr.net/gh/william-ordotype/crisp@main/crisp-loader.js"></script>
```

`crossorigin="anonymous"` matters: without it a parse failure of this file itself (the ORDOTYPE-FRONTEND-1F7 class) is muted by the browser to `Script error.`, which Sentry drops. The "Crisp skipped" reports travel as promise rejections and arrive either way.

## Deployment

Every embed points at `@main`, so there is no pin to bump, but jsDelivr caches the file. After each merge to `main`:

```
https://purge.jsdelivr.net/gh/william-ordotype/crisp@main/crisp-loader.js
```

The purge clears the edge cache instantly. Two caches remain: the `@main` to commit resolution cache can still serve the previous commit for up to 12 hours and cannot be purged, and browsers keep the file for up to 7 days (`max-age=604800`), so returning visitors run the previous loader until then. Expect Sentry cohorts to shift over about a week, not hours. To check what the edge serves, compare hashes:

```
curl -s https://cdn.jsdelivr.net/gh/william-ordotype/crisp@main/crisp-loader.js | shasum
shasum crisp-loader.js
```

## Browser floor

The site's hospital fleet still runs Chrome 78 and Safari 13. Anything newer than ES2019 syntax (`?.` and `??` on Chrome < 80 / Safari < 13.1, `??=` on Chrome < 85 / Safari < 14, class fields on Safari < 14.1) or a lookbehind inside a regex literal (Safari <= 16.3) makes the WHOLE file fail to parse on part of that fleet, silently killing Crisp and its own reporting guard (Sentry ORDOTYPE-FRONTEND-1F7). `eslint.config.js` turns both into errors and `.github/workflows/parse-floor.yml` runs it on every push:

```
npx --yes eslint@10 .
```

`node --check` does NOT cover this (Node parses ES2020 fine).

## How it works

1. Initializes the Crisp queue with your website ID
2. Loads Crisp's `l.js` lazily once the visitor may be tracked (member, or analytics consent) and the browser can run the bundle
3. When the user opens the chat or sends a message, the script:
   - Reads Memberstack data from `localStorage` (key: `_ms-mem`)
   - Extracts the member ID and email
   - Sends this data to Crisp as session data

## Crisp session data

The following data is pushed to Crisp:

| Key | Value |
|-----|-------|
| `ms_member_id` | Memberstack member ID |
| `page_url` | Current page URL (re-sent on every event, since app pages navigate client-side) |
| `user:email` | User's email address |

## Configuration

Update `CRISP_WEBSITE_ID` in the script with your Crisp website ID.

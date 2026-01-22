# Crisp Loader for Memberstack

A script that integrates Crisp chat with Memberstack authentication, automatically passing user data to Crisp sessions.

## Features

- Loads the Crisp chat widget
- Extracts Memberstack member ID and email from localStorage
- Pushes user data to Crisp when chat is opened or a message is sent

## Usage

Add this script to your website after Memberstack is loaded:

```html
<script src="crisp-loader.js"></script>
```

## How it works

1. Initializes the Crisp chat widget with your website ID
2. When the user opens the chat or sends a message, the script:
   - Reads Memberstack data from `localStorage` (key: `_ms-mem`)
   - Extracts the member ID and email
   - Sends this data to Crisp as session data

## Crisp session data

The following data is pushed to Crisp:

| Key | Value |
|-----|-------|
| `ms_member_id` | Memberstack member ID |
| `page_url` | Current page URL |
| `user:email` | User's email address |

## Configuration

Update `CRISP_WEBSITE_ID` in the script with your Crisp website ID.

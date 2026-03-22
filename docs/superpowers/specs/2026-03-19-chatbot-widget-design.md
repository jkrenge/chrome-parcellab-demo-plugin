# Chatbot Widget Design

## Overview

Add a floating chatbot widget to the Chrome extension that communicates with the parcelLab v4 Agents API. Users configure agent ID and JWT token in the popup, click "Add Chatbot" to inject a chat widget into the active tab, and converse with a parcelLab agent in multi-turn threads.

## Architecture

Follows existing extension architecture (Approach A: background-mediated API calls).

```
Popup → (INJECT_CHATBOT message) → Content Script → (injects widget UI)
Widget UI → (CHATBOT_EXECUTE / CHATBOT_SEND_MESSAGE) → Background Worker → (fetch) → Agents API
Background Worker → (polls thread) → Agents API
Background Worker → (response) → Content Script → (renders messages)
```

## Shared Types (`src/shared/types.ts`)

- `ChatbotConfig`: `{ agentId: string, token: string, baseUrl: string }`
- `ChatMessage`: `{ id: string, role: 'user' | 'assistant', content: string, timestamp: string }`
- New `BackgroundRequest` variants: `CHATBOT_EXECUTE`, `CHATBOT_SEND_MESSAGE`
- New `ContentRequest` variant: `INJECT_CHATBOT`
- `ChatbotResponse`: success with threadId + messages, or error

## Storage (`src/shared/storage.ts`)

- `getChatbotConfig()` / `saveChatbotConfig()` — persists agent ID, token, base URL
- Storage key: `chatbotConfig`

## Popup (`src/popup/App.tsx`)

- New config section: Agent ID input, JWT Token input (textarea or password field)
- "Add Chatbot" button — sends `INJECT_CHATBOT` message to content script
- Config auto-saved to storage on change

## Content Script (`src/content/index.ts`)

- Handles `INJECT_CHATBOT` message — injects or removes chatbot widget
- Widget injected inside a Shadow DOM for style isolation
- **Launcher:** Fixed bottom-right button (z-index: 2147483647), chat icon
- **Chat window:** Fixed panel above launcher with:
  - Header with title + close button
  - Scrollable message list
  - Text input + submit button
  - Loading state (typing indicator)
  - Error state (dismissible banner)
- Chat state managed in-memory within the content script
- Messages to background worker via `chrome.runtime.sendMessage()`

## Background Worker (`src/background/index.ts`)

New message handlers:

### `CHATBOT_EXECUTE`
1. `POST /v4/agents/{agent_id}/execute/` with `{ query, context? }`
2. Get `threadId` from response
3. Poll `GET /v4/agents/{agent_id}/threads/{thread_ref}/` until complete/failed/timeout
4. Return `{ threadId, messages }` to content script

### `CHATBOT_SEND_MESSAGE`
1. `POST /v4/agents/{agent_id}/threads/{thread_ref}/messages/` with follow-up query
2. Poll thread until complete
3. Return updated messages

### Polling
- Interval: 1s, max 60 attempts (60s timeout)
- Check `executionStatus` field for completion

## Auth
- JWT bearer token provided by user in popup text field
- Sent as `Authorization: Bearer <token>` header
- Base URL default: `https://product-api.parcellab.com`

## API Assumptions
- `POST /v4/agents/{agent_id}/execute/` returns `{ threadId, executionStatus }`
- `GET /v4/agents/{agent_id}/threads/{thread_ref}/` returns `{ executionStatus, messages[] }`
- `POST /v4/agents/{agent_id}/threads/{thread_ref}/messages/` accepts `{ query }` and triggers execution
- Messages have `role` and `content` fields

## UX
- Shadow DOM isolates widget styles from host page
- `position: fixed`, bottom-right, z-index 2147483647
- Polished, lightweight — matches parcelLab brand colors
- Loading: animated dots or spinner in message area
- Error: inline message with retry affordance
- Chat window ~400px wide, ~500px tall

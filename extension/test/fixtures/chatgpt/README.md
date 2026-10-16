# ChatGPT fixtures

The ChatGPT adapter in `src/adapters/chatgpt/` is written against the last
known shape of these endpoints:

| Endpoint                                                    | Expected shape                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `GET /api/auth/session`                                     | `{ accessToken: string }`                                     |
| `GET /backend-api/conversations?offset&limit&order=updated` | `{ items: [{ id, title, create_time, update_time }], total }` |
| `GET /backend-api/conversation/:id`                         | `{ title, create_time, update_time, current_node, mapping }`  |

Confirmed against live responses captured on 2026-10-16. To refresh the capture:

1. Open https://chatgpt.com and log in.
2. Open DevTools → Console, paste the contents of `scripts/capture-chatgpt-fixtures.js`, press Enter.
3. Move the three downloaded files into this directory. They are git-ignored because they contain your chats.
   If Chrome blocks the second and third downloads, allow "multiple downloads" for the site in the prompt next to the address bar.
4. Run `pnpm test`. `test/unit/chatgptParse.test.ts` picks up `chatgpt-conversation.json`
   and `chatgpt-conversations.json` automatically when present and checks they parse.

If parsing fails, update `src/adapters/chatgpt/parse.ts` and `config.ts` only.

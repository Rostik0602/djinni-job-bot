# djinni-job-bot

n8n bot: Djinni RSS → Postgres → Gemini scoring → Telegram message with buttons «✅ Відгукнувся / ❌ Пропустити».

## Commands

- `docker compose up -d` — start n8n (http://localhost:5678) and Postgres
- `npm test` — Jest tests for `src/`
- `npm run wf:export` — export workflows from n8n into `workflows/`
- `npm run sync` — copy `src/*.js` into Code nodes between `// @include-start` and `// @include-end`
- `npm run wf:import` — import `workflows/` into n8n, re-publish active workflows, restart n8n
- `npm run ai:try -- 3` — run the Gemini prompt on the 3 latest vacancies (needs `GEMINI_API_KEY` in `.env`)

## Rules

- Code for Code nodes lives in `src/`. Never edit code inside `workflows/*.json` by hand: edit `src/`, then run `npm run sync`.
- After any change in the n8n UI, run `npm run wf:export` before `sync` or `wf:import`, otherwise the import overwrites the UI changes.
- Never read or commit `.env`. Secrets live only in `.env` and n8n credentials. No personal data in code, prompts or workflows.
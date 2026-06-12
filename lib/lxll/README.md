# lxll backend integration

Client for the **李校来啦** backend, reverse-engineered from the official
H5 app (https://h5.lxll.com) and confirmed against real captured responses.

## Architecture

```
browser ──POST /api/lxll──▶ Next.js proxy (app/api/lxll/route.ts) ──▶ lxll
```

apiv2.lxll.com validates request Origin and rejects ours
(`403 Invalid CORS request`), so all calls go through a **same-origin
server proxy**. The proxy attaches the token (server-side fetch sends no
Origin) and forwards to either host.

## Two API generations, two envelopes

| | host | auth header | success | error |
| --- | --- | --- | --- | --- |
| RPC | `api.lxll.com/request/<Name>` | `x-token-c` | `{success:true,data}` | HTTP 400 `{success:false,errorCode,errorMessage}` |
| REST | `apiv2.lxll.com/<path>` | `Authorization: Bearer` | `{code:"0",msg,data}` | HTTP 400 `{code,msg}` |

Both also send `x-user-id` and `x-ua: ct=2&v=5.0.104`. Password is plaintext
over HTTPS (no client-side encryption).

## Confirmed endpoints & shapes (all verified against real responses)

- **Login** `POST apiv2 customer/login`
  body `{loginType:"PHONE_PASSWORD"|"ACCOUNT_PASSWORD", inviteUserId:"", phone|accountNo, password}`
  → `data.{refreshToken, accounts:[{accessToken, userId, userName, userType, ...}]}` (multi-account: one parent → several children)
- **Profile** `RPC QueryUserProfileByToken` → `{userId, userName, accountNo, userRole, age, gender, phone, company{...}}`
- **Metric** `RPC CustomerRetrieveStudentMetric` → `{totalLearnedWordCount, quota30, ...}`
- **Review schedule** `GET apiv2 customer/anti-forget/record/student` → `[{time, records:[{antiForgetId, courseOrderId, materialId, antiForgetDate, trainTime, status}]}]`
- **Review words** `GET apiv2 customer/anti-forget/detail?antiForgetIds=a,b` → `[{antiForgetId, courseOrderId, words:[{wordId, word, translation, phonetic, wrongTimes}]}]`
- **Submit results** `POST apiv2 customer/anti-forget/progress/submit`
  body `[{role:"STUDENT", antiForgetId, words:[{wordId, status:boolean}]}]` → `data:true`
- **Training board** `GET apiv2 customer/training/board` → upcoming sessions (teacher + material)

Word data has **no example sentence, illustration, or category** — the card
degrades to a first-letter tile and hides the sentence block; audio falls
back to Web Speech (pre-downloaded mp3s only cover the demo words).

## Files

- `client.ts` — proxy transport, token storage, both envelopes
- `endpoints.ts` — endpoint registry
- `types.ts` — confirmed response types
- `auth.ts` — login / profile / logout
- `api.ts` — schedule, words, metric, submit
- `adapter.ts` — `LxllWord` → app `VocabularyWord`

## Still open

- Request params for **new-word** (vs review) learning, if the app should
  also teach first-time words rather than only run due reviews.

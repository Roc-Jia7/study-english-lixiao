# lxll backend integration

Client for the **李校来啦** backend, reverse-engineered from the official
H5 app at https://h5.lxll.com (a uni-app build).

## Confirmed (verified against the live API)

| Aspect | Finding |
| --- | --- |
| Old API (RPC) | `POST https://api.lxll.com/request/<Endpoint>`, JSON body |
| New API (REST) | `POST https://apiv2.lxll.com/<path>` (e.g. `customer/login`) |
| Auth token | JWT; old API header `x-token-c: <jwt>`, new API `Authorization: Bearer <jwt>` |
| Other headers | `x-user-id`, `x-ua: ct=2&v=5.0.104` |
| Refresh | JWT auto-refreshed <300s before `exp` via `customer/refresh-token`; returns `accounts[{userId, accessToken}]` (one parent → several children) |
| Success envelope | `{ success: true, data }` |
| Error envelope | HTTP 400 `{ success:false, errorCode, errorMessage, errorLevel }` |
| CORS | Open — `Access-Control-Allow-Origin` echoes any origin (tested from our Vercel host). **Browser can call directly; no proxy needed.** |
| Login body | `CustomerLoginByPhoneAndPassword` with `{phone, password}` — a bad account returns `USER_NOT_EXISTED`, confirming the body is parsed |
| Roles | Accounts are `USER` (student/parent) or `TEACHER` (陪练/coach) |
| Submit param | `CustomerSubmitLearnNewWordResult` → `{courseBookId, courseOrderId, antiForgetTime}` |

The backend already implements its own spaced-repetition ("anti-forget")
system: `CustomerListNewWords`, `CustomerListReviewWords`,
`CustomerSubmit{LearnNewWord,Review}Result`, `antiForgetTime` — i.e. the
same forgetting-curve concept this app gamifies.

## PROVISIONAL (needs one real authenticated response to confirm)

The client bundle contains endpoint **names** but not server **response
shapes**, and page-level request params live in lazy route chunks. So these
are best-effort inferences, marked `PROVISIONAL` in code:

- exact field names of the login response (token / userInfo)
- `QueryUserProfileByToken` profile fields
- word row fields (`word`, `phonetic`, `translation`, `antiForgetTime`, …)
- course/student row fields
- list endpoint params (paging, `courseId` vs `courseOrderId`, …)

**To finish wiring real data:** log in once with a real test account, capture
the JSON responses, and replace the `[extra: string]: unknown` index
signatures with the real fields. No transport changes will be needed.

## Files

- `client.ts` — transport, headers, token storage + JWT staleness, envelope
- `endpoints.ts` — verbatim endpoint registry (RPC + REST)
- `auth.ts` — login (password / SMS), profile, logout
- `api.ts` — course & anti-forget word wrappers

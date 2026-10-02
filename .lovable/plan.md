

# bKash Token Caching — Database-Level Solution

## Problem

bKash allows **maximum 2 token grant calls per hour**. More than that = account block. Currently:

- `bkash-create-payment` has **no caching at all** — every payment request calls grant token
- `bkash-execute-payment`, `bkash-refund`, `bkash-search-transaction` have in-memory caching (`cachedToken` variable) — but **Edge Functions are stateless**, so the variable resets on every cold start, making the cache useless

This means every single bKash API call generates a new token grant request, which will quickly exceed the 2/hour limit.

## Solution

Store the bKash token in a **database table** so all Edge Functions share one token. Also use bKash's **Refresh Token API** instead of re-granting when the token is still valid.

## Implementation Steps

### Step 1: Create `bkash_tokens` table (migration)

```sql
CREATE TABLE bkash_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_token text NOT NULL,
  refresh_token text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
ALTER TABLE bkash_tokens ENABLE ROW LEVEL SECURITY;
-- No public access — only service role from edge functions
```

### Step 2: Create shared token management logic

All 4 bKash Edge Functions will use this flow:

1. **Check DB** for existing token where `expires_at > now()`
2. **If valid token exists** → use it directly (no API call)
3. **If token expired but refresh_token exists** → call bKash Refresh Token API (doesn't count toward the 2/hour limit)
4. **If no token at all** → call Grant Token API, store both `id_token` and `refresh_token` in DB

### Step 3: Update all 4 Edge Functions

| Function | Change |
|----------|--------|
| `bkash-create-payment` | Add DB token lookup, remove direct grant call |
| `bkash-execute-payment` | Replace in-memory cache with DB lookup |
| `bkash-refund` | Replace in-memory cache with DB lookup |
| `bkash-search-transaction` | Replace in-memory cache with DB lookup |

Each function will:
- Read token from `bkash_tokens` table using service role
- If expired, try refresh first, then grant as last resort
- Upsert the new token back to DB

### Step 4: Token expiry logic

bKash token is valid for **3600 seconds (1 hour)**. We'll set `expires_at` to `granted_at + 55 minutes` (5 min buffer) to ensure we refresh before actual expiry.

## Technical Details

### Refresh Token API call
```
POST {bkash_base}/tokenized/checkout/token/refresh
Headers: username, password
Body: { app_key, app_secret, refresh_token }
Response: { id_token, refresh_token, token_type }
```

### Files Modified
| File | Change |
|------|--------|
| Migration (new) | Create `bkash_tokens` table |
| `bkash-create-payment/index.ts` | DB-based token with refresh fallback |
| `bkash-execute-payment/index.ts` | DB-based token with refresh fallback |
| `bkash-refund/index.ts` | DB-based token with refresh fallback |
| `bkash-search-transaction/index.ts` | DB-based token with refresh fallback |


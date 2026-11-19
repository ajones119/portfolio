# 12: Turnstile when a session is created

**What to build:** If botting appears, new visitor sessions must pass an invisible Cloudflare Turnstile check before receiving a visitor cookie, raising the cost of scripted Placements without accounts.

**Blocked by:** 03

**Status:** needs-triage

- [ ] Decide whether botting has actually happened before building this
- [ ] The session endpoint verifies a Turnstile token server-side before issuing a cookie
- [ ] The page obtains the token invisibly; anonymity is preserved

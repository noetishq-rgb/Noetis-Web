# NOETIS pre-launch site

A single static page (`index.html`) plus `og.png`, deployed on Vercel. Sign-ups go to Supabase (`first_list` and `first_list_answers` tables, insert-only for visitors). See `docs/BACKEND_SETUP.md`.

## Editing

The page is assembled from `src/` (`style.css`, `body.html`, `app.js`, plus the two base64 logos). After editing, rebuild from the repo root:

```
python3 src/build.py
```

That rewrites `index.html`. Commit and push; Vercel deploys `main` automatically.

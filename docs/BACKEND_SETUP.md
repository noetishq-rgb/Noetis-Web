# NOETIS First List: connecting a real backend

The page never shows a ticket unless a server confirms the sign-up. Until an endpoint is set, the form shows "The First List isn't taking sign-ups on this preview yet. Nothing was sent."

## Where to configure

Add this inline script **before** the main script in `index.html` (or edit the `CFG` block at the top of the script):

```html
<script>
window.NOETIS_CONFIG = {
  SIGNUP_ENDPOINT: "https://<project>.supabase.co/rest/v1/first_list",
  SIGNUP_MODE: "supabase",            // "json" | "formspree" | "supabase"
  SUPABASE_ANON_KEY: "<public anon key>",
  ANSWERS_ENDPOINT: "https://<project>.supabase.co/rest/v1/first_list_answers",
  SITE_URL: "https://<your-domain>",  // canonical + share link
  CONTROLLER_NAME: "<legal entity>",  // shown in the privacy notice
  CONTACT_EMAIL: "<privacy contact>",
  TIMEOUT_MS: 12000
};
</script>
```

Only ever use a public/anon key here. Never a service-role key.

## What the page sends

Step 1 (name, email and role required; Instagram and LinkedIn optional):
```json
{"email":"maya@example.com","name":"Maya Rao","role":"Founder","instagram":"@maya","linkedin":"https://linkedin.com/in/maya","field_notes":false,"source":"prelaunch","consent_at":"2026-11-07T10:31:32.412Z"}
```
Step 2 (optional, only if they answer):
```json
{"email":"maya@example.com","step":2,"city":"Mumbai","noticed":null}
```

## How responses are read

| Server reply | What the visitor sees |
|---|---|
| 2xx | Step 2, then the ticket |
| 2xx with `{"status":"pending_confirmation"}` | "Check your inbox" card, no ticket |
| 2xx with `{"number":147}` | Ticket shows `NO. 0147` (only if you want a real serial) |
| 2xx without a number | Ticket shows a neutral `REF · XXXXXX` that implies no rank |
| 409, or Postgres code `23505`, or `{"status":"duplicate"}` | "This email is already on the First List." |
| 400 / 422 | "That email doesn't look quite right." |
| other 4xx/5xx | "Something went wrong on our side… Nothing was saved." |
| no reply in 12 s | "That took too long… Nothing was saved yet." |
| offline / CORS / DNS | "We couldn't reach the list… Nothing was saved." |

## Option A: Supabase (recommended)

```sql
create table public.first_list (
  id bigint generated always as identity primary key,
  email text not null,
  name text not null,
  role text check (role in ('Founder','Creator','Working professional','Business owner','Freelancer','Student','Other')),
  instagram text check (char_length(instagram) <= 60),
  linkedin text check (char_length(linkedin) <= 200),
  field_notes boolean not null default false,
  source text,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create unique index first_list_email_key on public.first_list (lower(email));

create table public.first_list_answers (
  id bigint generated always as identity primary key,
  email text not null,
  step int,
  city text,
  noticed text check (char_length(noticed) <= 500),
  created_at timestamptz not null default now()
);

alter table public.first_list enable row level security;
alter table public.first_list_answers enable row level security;
-- Insert only. Nobody using the anon key can read, update or delete.
create policy "anon can join" on public.first_list for insert to anon with check (true);
create policy "anon can answer" on public.first_list_answers for insert to anon with check (true);
```

Set CORS in Supabase to your domain. Because inserts use `Prefer: return=minimal`, no serial number comes back, so tickets show the neutral `REF`. If you want real serials, put a small Edge Function in front that inserts and returns `{"status":"ok","number":<id>}` and use `SIGNUP_MODE: "json"`.

**Double opt-in (recommended for EU/UK visitors):** have an Edge Function or database webhook send a confirmation email with a signed link that sets `confirmed_at`, and return `{"status":"pending_confirmation"}` from that function. The page already handles that state.

## Option B: Formspree

`SIGNUP_ENDPOINT: "https://formspree.io/f/<id>", SIGNUP_MODE: "formspree"`. Formspree does not reject duplicates, so dedupe on export. Step 2 answers go to the same form unless `ANSWERS_ENDPOINT` is set.

## Option C: your own endpoint

`SIGNUP_MODE: "json"`. Accept the JSON above, respond with the statuses in the table, allow CORS from your domain, and rate-limit by IP.

## Before launch

- Fill `CONTROLLER_NAME` and `CONTACT_EMAIL` so the privacy notice names who holds the data.
- Set `SITE_URL`, and change `og:image` / `twitter:image` in the `<head>` to the absolute URL of `og.png` (crawlers need absolute URLs).
- Upload `og.png` next to `index.html`.

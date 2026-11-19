# Travel Planner

A simple, installable travel planner: trips, a day-by-day itinerary with hotels and flights, and expense tracking in any currency with Splitwise-style bill splitting. Works offline and stores data on your device.

**Live app:** https://aidan17715.github.io/travel-planner/

## Install on any device

- **Phone (Android/Chrome):** open the link → menu → *Install app* / *Add to Home screen*.
- **iPhone (Safari):** open the link → Share → *Add to Home Screen*.
- **PC/Mac (Chrome/Edge):** open the link → click the install icon in the address bar.

## Moving data between devices

Without sharing set up, data is stored locally on each device. Use **Export** on one device to save a `.json` backup, then **Import** it on another.

## Sharing trips with friends (optional)

Once set up, you can sign in with Google, tap **Share** on a trip and send an **invite link**. Everyone who joins can edit the trip, and changes sync between devices (live when online, queued when offline). Only people with a valid invite link can open a trip. The owner can revoke links, remove people, or stop sharing at any time.

Until the values in `src/cloud/config.ts` are filled in, the sharing buttons stay hidden and the app works exactly as before.

### One-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free plan is fine).
2. **Create the database tables:** in the project, open *SQL Editor → New query*, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click *Run*. This also turns on the security rules that keep trips private to their members.
3. **Set up Google sign-in:**
   - In [Google Cloud Console](https://console.cloud.google.com/) create a project, then *APIs & Services → OAuth consent screen* (user type *External*, fill in the app name and your email). Under *Audience*, set the publishing status to **In production** so friends outside your test list can sign in.
   - *Credentials → Create credentials → OAuth client ID → Web application*. Under *Authorised redirect URIs* add `https://<your-project-ref>.supabase.co/auth/v1/callback`.
   - Copy the **Client ID** and **Client secret**.
   - In Supabase, open *Authentication → Providers → Google*, enable it and paste the two values.
4. **Allow the app's address:** in Supabase *Authentication → URL Configuration* set **Site URL** to `https://aidan17715.github.io/travel-planner/` and add the same address under **Redirect URLs** (add `http://localhost:*/**` too if you run it locally).
5. **Connect the app:** in Supabase *Project Settings → API*, copy the **Project URL** and the **anon public** key into `src/cloud/config.ts`, then commit and push. (The anon key is meant to be public; the database rules are what protect the data.)

## Development

```
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run lint
```

Pushing to `main` automatically deploys to GitHub Pages (see `.github/workflows/deploy.yml`).

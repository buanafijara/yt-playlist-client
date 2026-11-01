# YT Client

A stateless YouTube web client. Users sign in with Google and see:

- **Playlists** (`/playlists`, the default page after sign-in): videos from every playlist they own, loaded in batches as they scroll. Each video is de-duplicated and tagged with the playlists it belongs to. Filter by one or more playlists from the "All playlists" pop-up, or by clicking a tag. The button next to each title opens "Save to playlist", where ticking a playlist adds the video to it and unticking removes it.
- **Subscriptions** (`/feed`): the latest uploads from every channel they subscribe to, newest first, with infinite scroll.
- **Length filter** (both pages): YouTube's own buckets: under 4 min, 4–20 min, over 20 min. Durations come with every video, so filtering happens in the browser and costs no quota. On Playlists it filters what has loaded so far, and keeps loading batches until the screen fills with matches.

There is no database. OAuth tokens are kept in an AES-256-GCM encrypted, `httpOnly` cookie and refreshed automatically.

## Setup

1. In [Google Cloud Console](https://console.cloud.google.com/):
   - Enable **YouTube Data API v3**.
   - Configure the OAuth consent screen and add the scope `.../auth/youtube` ("Manage your YouTube account"). The app needs write access to add videos to playlists and remove them.
   - Create an **OAuth client ID** (Web application) with the redirect URI `http://localhost:5173/auth/callback`, plus your production URL.
2. Copy `.env.example` to `.env` and fill it in.
3. Run the app (Node 22, see `.nvmrc`):

```sh
npm install
npm run dev
```

## How it works

| Path | Purpose |
| --- | --- |
| `src/env.ts` | Declares and validates the env vars (exposed through `$app/env/private`) |
| `src/hooks.server.ts` | Decrypts the session cookie and refreshes the access token when it is close to expiry |
| `src/routes/auth/*` | Google OAuth: authorization code flow with PKCE, logout revokes the token |
| `src/lib/server/youtube.ts` | YouTube Data API calls for the feed, the playlist list and playlist pages |
| `src/routes/api/playlists/[id]/items` | `GET` returns one batch (up to 50 videos) of a playlist. `POST` saves a video to it, skipping videos already there |
| `src/routes/api/playlists/[id]/items/[itemId]` | `DELETE` removes one entry from the playlist |
| `src/lib/playlist-loader.svelte.ts` | Client-side loader that walks the playlists batch by batch, caches pages and merges tags |

### Loading

The page loads don't wait for YouTube. They return the request as a promise that SvelteKit streams to the page, so a skeleton shows straight away and the content replaces it when it arrives. Errors after that point are shown in the page with a retry or sign-in button.

- **Playlists** loads only the playlist list up front. Videos are fetched in batches from `/api/playlists/[id]/items` as the user scrolls, going through the playlists biggest first: All walks every playlist, and a selection (picked from the "All playlists" pop-up, which supports search and multiple selection) walks just those. Each fetched page is cached for the visit, so switching chips never fetches the same page twice. The first page of the next few playlists is prefetched in parallel. Because videos arrive playlist by playlist, they are listed in playlist order, not sorted by date added across playlists.
- **Shuffle** (on Playlists) needs the whole selection before it can pick a random order, so it loads every page of the selected playlists first, six playlists at a time, with a progress bar. It then reveals the shuffled list 24 cards at a time. Pages come from the same cache, so Reshuffle and switching Shuffle off and on again are instant.
- **Subscriptions** has to read every channel before it knows which videos are newest, so the feed is fetched in one pass and revealed 24 cards at a time as the user scrolls.

### API quota

The default YouTube quota is 10,000 units/day **for the whole app**, shared by all users. The costs are:

- **Subscriptions:** about 1 unit per subscribed channel per page load, plus 1 per 50 videos for durations. YouTube has no feed endpoint, so the app reads each channel's uploads playlist.
- **Playlists:** 1 unit per 50 playlists on page load, then 2 units per batch of 50 videos as the user scrolls.
- **Saving and removing:** 51 units to save a video to a playlist (a check for an existing entry, then the insert), and 50 units to remove one. These are by far the most expensive actions: the default quota covers only about 200 of them a day.

Links preload on tap rather than hover to keep quota use down. Request a quota increase from Google before going public.

### Deploying (Vercel)

The app uses `@sveltejs/adapter-vercel`. Production is https://yt-custom-client.vercel.app.

1. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `SESSION_SECRET` for Production with `vercel env add <NAME> production`. They're needed at build time too.
2. Add `https://yt-custom-client.vercel.app/auth/callback` to the OAuth client's authorized redirect URIs.
3. Deploy with `vercel deploy --prod`. `.vercelignore` keeps `.env` files and the downloaded `client_secret_*.json` out of the upload.

Sign-in only works on the production domain, because preview deployments get a new URL each time.

### Notes

- While the OAuth app is in Google's "Testing" mode, refresh tokens expire after 7 days, so users have to sign in again.
- Google doesn't expose Watch Later through the API, and Liked videos aren't included.

## License

[MIT](LICENSE)

# BENJ.MOVIE

A vanilla HTML/CSS/JS streaming-platform concept UI. No video is streamed —
it's UI only, with real poster/backdrop art pulled from TMDB.

## Setup

1. Open `.env` and replace `your_key_here` with your TMDB API key:

   ```
   TMDB_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   Get a free key at: https://www.themoviedb.org/settings/api

2. Start the local server (needs Node.js installed — no npm packages
   required, it's a plain Node script):

   ```
   npm run dev
   ```

3. Open the printed URL — usually http://localhost:8000

4. If no valid key is set in `.env`, the site still loads and runs fully,
   just with placeholder art instead of real posters.

## A note on the key

This is a fully client-side site. Even loaded through `.env` like this,
the key is downloadable by anyone who can reach the page — fine for local
use, but **don't deploy this publicly as-is**. If you want to host it
somewhere real, the key needs to sit behind a small server-side proxy
instead of shipping to the browser at all — ask if you'd like that set up.

# Local website analytics

The collector stores Google Search Console and Cloudflare history in
`analytics/cache/analytics.sqlite3`. Repeated runs refresh recent rows and keep
older data locally. CSV exports are written beside the database and SVG figures
to `analytics/plot/`. All credentials, data, and generated figures are ignored
by Git.

## Google Search Console

A service account is the preferred setup for unattended collection:

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Search Console API**.
3. Create a service account and download a JSON key.
4. In Search Console, open **Settings → Users and permissions → Add user** and
   add the service account email with **Full** permission.
5. Save the downloaded key as
   `analytics/credentials/google-service-account.json`.
6. Run `npm run analytics -- google`.

Never commit or send the service-account key. It grants access until it is
disabled, removed from Search Console, or the key is deleted.

## Cloudflare

Create a scoped API token with **Account Analytics: Read**. Either add
**Zone: Read** so the script can resolve the zone or copy the zone ID from the
Cloudflare dashboard. Store the values in the already-ignored `.env.local`:

```text
CLOUDFLARE_API_TOKEN=replace-with-token
CLOUDFLARE_ZONE_ID=replace-with-zone-id
```

Then run `npm run analytics -- cloudflare`.

## Commands

```bash
npm run analytics                # collect every configured source and plot
npm run analytics -- google      # Search Console only
npm run analytics -- cloudflare  # Cloudflare only
npm run analytics -- plot        # regenerate figures from SQLite
npm run test:analytics            # test storage and plotting
```

The generated figures are:

- `search_visibility.svg`: impressions and clicks over time
- `search_performance.svg`: click-through rate and average position
- `top_queries.svg`: highest-impression Google queries
- `website_traffic.svg`: Cloudflare visits and requests

The database can also be queried directly:

```bash
sqlite3 analytics/cache/analytics.sqlite3
```

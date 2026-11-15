# PRMS client preview from this PC

The temporary preview serves the built React site, Express API, local MySQL data,
and local property photos through one Cloudflare Quick Tunnel. It does not move
the application or database to Cloudflare hosting.

## Approved viewing windows

All dates are in 2026, in Malaysia time (Asia/Kuala_Lumpur, UTC+8):

| Date | Opening | Closing |
|---|---|---|
| 13 November | 6 PM | 10 PM |
| 14 November | 2 PM | 6 PM |
| 15 November | 2 PM | 6 PM |

The gateway checks `scripts/demo-schedule.json` on startup and checks the time on
every request. It returns a non-cacheable closed response for pages, assets and
API requests outside the windows. The launcher stops the tunnel after the final
window. It does not alter or reseed the database.

Valid schedule-file changes are reloaded within a second without restarting the
tunnel. An unreadable or invalid schedule stops the preview rather than leaving
access open. Additional test windows must be explicitly approved by the owner.

## Start

In Command Prompt, from `prms-backend`:

```cmd
npm run demo:cloudflare
```

The launcher starts local MySQL if needed, builds both applications, starts a
separate loopback-only origin on port 3510 and scheduled gateway on port 3511,
then prints the HTTPS `trycloudflare.com` client link. The frontend build uses
the current public origin for API and photo requests rather than localhost.
Existing security middleware and private environment settings are preserved.

Keep this terminal open and the PC awake with Internet access. The normal Vite
and development backend terminals are not needed for the client link. Your
normal development servers, if running, are not stopped by this launcher.

The same link remains available while that tunnel process stays running. It
shows the closed page between viewing windows. Restarting the launcher creates
a new random link, which must be shared again. An Internet interruption or sleep
can make the preview unavailable. Quick Tunnels have no uptime guarantee.

Press Ctrl+C in the demo terminal to stop the preview early. MySQL is left
running. The current link is recorded privately in
`.artifacts/cloudflare-demo/status.json`.

If the demo was started in the background, run `npm run demo:stop` from
`prms-backend` to stop only this demo, without stopping development servers.

Use email/password demo accounts for this preview. Google sign-in may require
the generated hostname to be added to the Firebase/OAuth authorized domains.
The launcher does not change those external account settings.

## Verification

```cmd
node --test scripts/__tests__/cloudflare-demo.test.mjs
```

Run this command from the repository root. Tests use local temporary HTTP servers
and a supplied clock to check exact opening and closing boundaries. No test
clock override is exposed by the running demo gateway.

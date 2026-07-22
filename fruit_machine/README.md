# 🧧 Aleks' Lucky 8's — 4-Reel Chinese Fortune Slots

A high-resolution, graphical slot machine you run in the cloud and play in your
browser. Four reels, glossy hand-drawn Chinese-fortune symbols (gold coins, red
lanterns, koi, jade discs, gold ingots, red packets, a 福 fortune tile, and the
lucky **8**), animated spinning with motion blur, and the two classic
fruit-machine features:

- **NUDGE** — randomly awarded after a blank spin. Move any reel up or down one
  symbol at a time to line up a win.
- **HOLD** — randomly offered before a spin. Lock the reels you like so they
  don't spin next time.

All graphics are drawn on an HTML5 canvas (no image assets), and sound is
generated with the Web Audio API, so the whole game is a single self-contained
page. The server just serves that page.

## What's in here

| File | Purpose |
|------|---------|
| `static/index.html` | The entire game (canvas graphics, game logic, sound). |
| `server.py` | Tiny FastAPI server: serves the page + `/healthz`, binds to `$PORT`. |
| `requirements.txt` | `fastapi`, `uvicorn`. |
| `Dockerfile` | Container image for Cloud Run. |
| `app.yaml` | Config for App Engine (alternative to Cloud Run). |

## Play locally

```bash
cd fruit_machine
pip install -r requirements.txt
python server.py            # serves on http://localhost:8080
```

Open <http://localhost:8080>. You start with 20 free credits; **＋ Insert Coin**
adds 10 more.

**Controls**

- **Spin** — click the red button or press `Space`.
- **Hold** — when HOLD lights up gold, click it under a reel (or press `1`–`4`).
- **Nudge** — when a reel's ▲ / ▼ light up blue, click them (or press `1`–`4`
  to nudge down, `Shift`+`1`–`4` to nudge up).
- **Paytable** — full symbol payouts; 4-of-a-kind is the jackpot, and four
  **Lucky 8**s pay the top prize of **888**.

## Deploy to Google Cloud

### Option A — Cloud Run (recommended)

The simplest path: build from source and deploy in one command. Run this from
inside the `fruit_machine/` directory.

```bash
gcloud run deploy lucky-8s \
  --source . \
  --region europe-west2 \
  --allow-unauthenticated
```

`gcloud` builds the container from the `Dockerfile`, pushes it, and prints a
public `https://lucky-8s-....run.app` URL you can open on any device. Cloud
Run passes `$PORT` (8080), scales to zero when idle, and costs nothing while
nobody is playing.

First-time setup (once per project):

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

To update after changing the code, re-run the same `gcloud run deploy` command.

### Option B — App Engine (Standard)

```bash
gcloud app deploy app.yaml
```

Then `gcloud app browse` opens the deployed game. `app.yaml` uses the Python 3.12
runtime and scales to zero.

### Option C — plain container anywhere

```bash
docker build -t lucky-8s .
docker run -p 8080:8080 lucky-8s
# then open http://localhost:8080
```

The same image runs on Cloud Run, GKE, Compute Engine, or any container host.

## Notes

- Play money only — there is no real-money wagering, accounts, or persistence.
- Game state (credits/wins) lives in the browser tab and resets on reload.

# 🧧 Aleks' Lucky 8's — 88 Fortunes-Style Slots

A high-resolution, graphical **5×3, 243-ways** slot machine you run in the cloud
and play in your browser — inspired by the *88 Fortunes* casino games. Glossy
hand-drawn Chinese-fortune symbols and gilded card royals, animated spinning
with motion blur, a four-tier progressive jackpot ladder, and two bonus
features:

- **Progressive jackpot ladder** — **GRAND / MAJOR / MINOR / MINI** meters that
  ratchet up on every spin.
- **福 FU wild** — substitutes for any symbol except the scatters.
- **Cash Pot** — every gold coin that stops on the reels drifts in an arc into
  the half-open pot below the reels. Fill it (8 coins, across as many spins as it
  takes) and the lid slams shut to launch the **Jackpot Pick**: tap coins and
  match **3 of a tier** to win that jackpot. The pot then empties and reopens.
- **Free Games** — land **3+ lanterns** for **8 free spins** with all wins
  **doubled** (re-triggerable).

Wins are **243 ways**: matching symbols on adjacent reels from reel 1 pay in any
position — no fixed paylines. All graphics are drawn on an HTML5 canvas (no image
assets), and sound is generated with the Web Audio API, so the whole game is a
single self-contained page. The server just serves that page.

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

Open <http://localhost:8080>. You start with 500 free credits; **＋ Insert Coin**
adds 100 more.

**Controls**

- **Spin** — click the red button or press `Space`.
- **Bet** — use the `−` / `+` buttons (or `↓` / `↑` arrows); wins scale with bet.
- **Jackpot Pick** — when triggered, tap the gold coins to reveal jackpot tiers;
  match 3 of a tier to win it.
- **Free Games** — awarded automatically; press `Space` to play each free spin.
- **Paytable** — full 243-ways payouts and how the wild, jackpot pick, and free
  games work.

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

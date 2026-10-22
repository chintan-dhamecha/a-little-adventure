# Happy Birthday, Sonali 💌 — a little browser game

A mobile-friendly, fully interactive birthday game. Plain HTML/CSS/JS, no build
step, no backend — just a static folder you can open locally or deploy
anywhere for free.

## What's inside

```
index.html      the page skeleton (all screens live here, mostly hidden/shown by game.js)
styles.css      all visual styling + the colour theme (CSS variables at the top)
game.js         ALL game logic. Never contains content — only reads content.js.
content.js      EVERYTHING you'll want to edit: photos, questions, answers, text, passcode
Start Game.bat  double-click this to test the game locally (see "Testing locally" below)
serve.ps1       the tiny local server that Start Game.bat runs — you shouldn't need to touch this
assets/
  level1/       "Guess the place" photos (Bangalore Palace, Sakleshpur, Bali)
  level2/       (no images needed — text-only questions)
  level3/       "What was she wearing" photos (temple, wedding, trip)
  puzzle/       a generated diamond-heart graphic (swap for a real photo of the two of you if you'd rather)
README.md       this file
```

Level 1 and Level 3 now use real photos. The puzzle's diamond-heart graphic
is a generated `.svg` placeholder — keep it, or swap it for a real `.jpg`
photo of the two of you (same `assets/puzzle/` folder) any time —
see "Replacing photos" below.

## Editing `content.js` — everything you'll actually touch

Open `content.js` in any text editor. It's one big `GAME_CONTENT` object,
organised by level, with comments above each section. You do **not** need to
touch `game.js`, `styles.css`, or `index.html` for normal content changes.

Here's what to replace:

| Field | What it is |
|---|---|
| `herName` | Shown on the intro screen ("For \<herName\>") |
| `PASSCODE_PLAINTEXT` (near the top) | The passcode she'll type to unlock the game. Change the word in quotes — it's hashed automatically, you never need to compute anything. |
| `passcodeHints` | Two hints, shown after 2 and 4 wrong guesses |
| `level1.rounds` | 3 rounds: a `photo`, 4 `options` (location names), `answerIndex` (0-3, which option is correct), and a `slideshow` array of `{src, caption}` photos shown after a correct guess |
| `level2.questions` | 5 questions: `question` text, 4 `options`, `answerIndex` |
| `level3.rounds` | 3 rounds: a `photo` (shown in black & white), 4 colour `options` as `{name, hex}`, `answerIndex`, and an optional `caption` memory |
| `reasons` | A list of "reasons I love you" — add as many as you like |
| `reasonsToCollect` | How many of the above she needs to collect in Level 4 (default 15; must be ≤ `reasons.length`) |
| `puzzle.photo` | The photo for the final 6-piece jigsaw (a photo of the two of you) |
| `puzzle.gridCols` / `gridRows` | Puzzle grid size (default 3x2 = 6 pieces). Keep `cols x rows` at 6 unless you also adjust pacing (see note below). |
| `puzzle.prePlacedCount` | How many pieces are already sitting on the board when she arrives (default 3) — the rest are filled by the puzzle pieces she earns in Levels 1 & 3 |
| `finalMessage` | Your birthday message on the last screen |
| `giftClue` | A riddle-style clue for the real gift, shown before she "unwraps" |
| `giftHint` | A second, more obvious clue, shown if she taps "Show hint" |

A note on the puzzle: Levels 1 and 3 each award one puzzle piece per round
(3 + 3 = 6 pieces total, matching the pieces tray at the top of the screen).
On the Level 5 board, `prePlacedCount` of the 6 grid cells start already
filled in, and the remaining `6 - prePlacedCount` are the ones she drags into
place from her earned pieces. The default (3 pre-placed, 3 to place) is a
good balance — don't set `prePlacedCount` so low that there are more empty
cells than the 6 pieces she'll have earned.

## Replacing photos

- **Format:** JPEG, about **1600px on the long edge**, under **400KB** each.
  (Smaller is fine too — this just keeps things fast on phones.)
- **Where:** drop your files into the matching `assets/levelX/` or
  `assets/puzzle/` folder (any filenames you like).
- **Then:** update the matching path(s) in `content.js` to point at your new
  filenames (e.g. change `'assets/level1/paris_1.svg'` to
  `'assets/level1/paris_1.jpg'`).
- The puzzle photo (`puzzle.photo`) looks best at roughly the same aspect
  ratio as the grid (3:2 by default, i.e. a landscape photo) — it gets evenly
  sliced into `gridCols x gridRows` rectangles, so a very differently-shaped
  photo will look slightly stretched per piece. Not a big deal, just a tip.
- Keep each photo's **file extension matching its actual format** — a `.jpg`
  file must actually be a JPEG, etc. (This matters for `background-image`
  slicing on the puzzle in particular.)

## Testing locally

**Don't double-click `index.html` to test it** — opening it directly as a
`file://` URL silently breaks parts of the game in some browsers (things
look like they load, but clicks stop working partway through, with no
visible error unless you open DevTools). Always run it through a local
server instead:

### Easiest: just double-click `Start Game.bat`

It starts a tiny local server (no install needed — it uses PowerShell,
which is already on your computer) and opens the game in your browser
automatically, at `http://localhost:8787`. Leave the black window open
while you're testing; close it when you're done.

### Alternatives, if you have these installed

```bash
# Python 3
cd birthday-game
python3 -m http.server 8000
# then open http://localhost:8000

# Node (no install needed)
cd birthday-game
npx serve .
# then open the URL it prints

# VS Code
# Right-click index.html -> "Open with Live Server" (if you have the extension)
```

Then just click through the whole game once after any content change —
wrong answers, the 3-wrong-tries reveal, refreshing mid-level (progress
should resume), and the puzzle drag-and-drop.

**Hidden reset (for your testing only):** there's a very faint "reset" link
in the bottom-right corner of the passcode screen. Tap it twice (it asks you
to confirm) to wipe saved progress and start over. It's intentionally subtle
so it won't distract her.

## Deploying for free (under 5 minutes)

### Option A — Netlify Drop (fastest, no account needed to preview)

1. Go to **https://app.netlify.com/drop**
2. Drag your whole `birthday-game` folder onto the page.
3. Netlify gives you a live URL immediately (something like
   `random-name-123.netlify.app`). That's it — share that link.
4. (Optional) Sign up free to claim the site and pick a nicer subdomain.

### Option B — GitHub Pages

1. Create a new GitHub repository and push this folder to it:
   ```bash
   cd birthday-game
   git init
   git add .
   git commit -m "Birthday game"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo-name>.git
   git push -u origin main
   ```
2. On GitHub, go to the repo's **Settings → Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch",
   branch `main`, folder `/ (root)`. Save.
4. After a minute, your site is live at
   `https://<you>.github.io/<repo-name>/`.

### Option C — Vercel or Cloudflare Pages

Both work the same way: create a free account, "Add new project" / "Create a
project", point it at this folder (or connect the GitHub repo from Option B),
leave the build command empty (this is a static site, no build step), and
deploy. You'll get a live URL in under a minute.

Whichever you pick, just send her the link — on a phone or laptop, portrait
or landscape, it all works the same.

## A couple of honest notes

- Sound is off by default (there's a mute/unmute toggle, top-right) — a few
  tiny generated beep sounds play on correct answers/pops if you turn it on.
  There are no external audio files to replace.
- If you ever want to change the colour theme, everything is driven by CSS
  variables at the very top of `styles.css` (`--color-rose-gold`,
  `--color-plum`, etc.) — change those and the whole game re-themes.

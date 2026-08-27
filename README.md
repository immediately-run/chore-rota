# Chore rota

Who takes out the trash, who brings the cookies — rotations and sign-up sheets
for a shared space. An example app for [immediately.run](https://immediately.run).

**Try it:** <https://immediately.run/present/github/immediately-run/chore-rota/main/files/src/App.tsx>

## What it does

- **Rotations.** A chore (name, cadence — daily / weekly / every two weeks /
  monthly — and a start date) plus an ordered roster of names. The app computes
  who is on duty for any date: the *On duty now* board shows one tile per chore
  and each rotation card lists the current period and the next three.
  - **Done** marks a period as done (records who and when); tap again to undo.
  - **Swap** hands a period to someone else and, by default, gives the original
    person that member's next turn in return.
- **Sign-up sheets.** An event ("Bake sale, Sat 10:00") with slots ("Cookies
  (1 of 2)", "Drinks"). Members claim a slot with their name; a slot claimed by
  someone else shows who took it; the claimer can release it.

Works on a phone (375 px wide) first, and on a desktop.

## Where the data lives

Everything is plain JSON on the immediately.run filesystem, **one record per
file**, so several people writing at once never clobber each other:

```
<store>/chores/<choreId>.json                 chore + roster
<store>/overrides/<choreId>/<periodKey>.json  { period, from, to, by, at }  (a swap)
<store>/done/<choreId>/<periodKey>.json       { by, at }
<store>/sheets/<sheetId>.json                 event + slot definitions
<store>/claims/<sheetId>/<slotId>.json        { by, at }
```

`periodKey` is the first day of the period (`YYYY-MM-DD`). Each record
directory holds a `.keep` file so the change-poller has a baseline even when
the directory is empty.

`<store>` is either

- your **private, per-user app folder** (the "keep it private" choice), or
- a folder `chore-rota/` inside a **shared space**.

The choice (and the space id) is remembered in `<private>/config.json`, so the
next launch re-opens the same space without a prompt.

## Using it with other people

Shared mode is the normal mode. On first run pick *Create a shared space* or
*Open an existing space*; the platform shows the consent / picker dialog. The
app cannot invite anyone — share the space itself from immediately.run's
**Spaces** page. Members with a read-only grant see everything but get no
buttons.

Other members' writes are picked up by polling the record directories every
3 s; the *Live* indicator in the top bar flashes *Updated* when something
changed. Your name on claims, done-marks and swaps is your immediately.run
login; if the host reports none, set a name from the *You* pill.

## Local development

```bash
npm install
npm run dev      # vite dev; the `fs` module is bridged to ./devfs-playground/ (git-ignored)
npm run build
npm run lint
```

Under `vite dev` there is no host, so *private* and *shared* are just two
folders under `devfs-playground/` and no consent dialog appears. To exercise the
real capability path (consent, read-only grants, spaces) run it inside the host:

```bash
immediately.run dev . --origin https://local.immediately.run
```

## License

MIT — see `LICENSE`.

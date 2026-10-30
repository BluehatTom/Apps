# Tom's App Hub v3

A standalone web dashboard for HTML apps found in GitHub repositories and apps added manually. Works as a single HTML file or as a GitHub Pages site. No npm or backend required.

## Install / update

**Standalone:** Open `Toms_App_Hub_v3.html` in your browser.

**GitHub Pages:** Upload `index.html`, `styles.css`, `app.js`, and `.nojekyll` from the ZIP to the root of the repository hosting the hub, replacing the previous files. For a new site, enable GitHub Pages under repository **Settings → Pages → Deploy from a branch → /(root)**.

The v3 app uses the same local storage key and configuration schema as v2. On the same GitHub Pages URL, existing saved apps, repositories, link overrides, favorites, and categories are retained. **Export a JSON backup in Settings & sync before replacing your site.** If you open the standalone file under a different local filename or folder, your browser may give it separate storage; use Export/Import backup to transfer configuration. If you use several computers, republish your configuration to GitHub after making changes.

## Connecting a GitHub repository

1. Click **Connect GitHub** and enter a repository URL, for example `https://github.com/USERNAME/my-apps`, or `USERNAME/my-apps`.
2. Leave **App pages (recommended)** selected. It finds HTML files while skipping common test, example, documentation, and third-party dependency paths.
3. If you know the site's published base URL, enter it. Otherwise GitHub Pages is detected when possible; the hub can infer an unverified link if metadata is unavailable.
4. Click **Connect & scan**. You can also browse public repositories using **GitHub sources → Find repositories**.

Under **GitHub sources**, choose the **Files to include** setting for an existing repository and click **Scan now**:

- **App pages (recommended):** excludes common supporting HTML pages.
- **All HTML files:** includes documentation/examples/tests if they contain HTML (except third-party dependency paths).
- **Only index.html:** includes HTML entry pages named `index.html`.

If v2 produced too many cards, switch that repository from **All HTML files** to **App pages (recommended)** and click **Scan now**. Your own edits to app cards are retained for any file that remains in the new scan.

Each repository scan lists the matching apps, ignored HTML count, link base, and any GitHub API error. Scans happen **only when you request them**; the app does not automatically rescan when opened. A repository with no matching app pages appears as a GitHub repository shortcut.

## Automatic launch links

For a file such as `tools/my-tool.html` in a repository called `my-apps`, a GitHub Pages link usually looks like:

`https://USERNAME.github.io/my-apps/tools/my-tool.html`

Link base precedence is **repository override → shared website root → detected GitHub Pages URL → suggested GitHub Pages URL**. Use **GitHub sources → Shared GitHub Pages website root** to set a URL once for all repositories, or enter a repository-specific base URL on the repository card.

For GitHub Pages published from `/docs`, the `docs/` prefix is omitted from generated launch links. GitHub Actions deployments can publish files in a different structure from the source repository; in that case, edit the individual app's launch URL. A *Suggested link* is not proof that the page is publicly deployed. GitHub Pages must be enabled and configured for the launch link to work.

## Editing and organization

- Use the star button for favorites and the pencil for name, category, icon, description, stage, tags, and launch URL.
- Discovered app edits survive rescans.
- Use **All apps** for search, category filtering, ordering, and list/grid layout. Long lists load 60 cards at a time.
- Use **Settings & sync** for theme, accent, exporting/importing a JSON backup, and restoring hidden apps.

## GitHub token and config sync

Public repositories can be scanned without a token, subject to GitHub API limits. Private repositories require a fine-grained token with access to the repository and Contents read permission. For publishing `app-hub.json` in a repository, the token needs Contents read/write permission for that repository.

1. Open **Settings & sync** and use **GitHub personal access token** to enable a token for the current browser tab only.
2. Set **Configuration repository** and **Configuration file path** (typically `app-hub.json`).
3. Click **Publish to GitHub**, or **Load from GitHub** to restore settings on another computer.
4. For automatic setup when opening a fresh GitHub Pages site, put `app-hub.json` in the published website root and use **Load site config** for an explicit reload.

The token is held in JavaScript memory only, never stored in local storage, the JSON file, or exported backups. **Do not publish private repository names, links, or descriptions in a publicly accessible `app-hub.json` file unless you want them publicly visible.**

## Reliability changes in v3

- Scans no longer run silently on startup.
- Concurrent scans of the same repository share one request, avoiding racing updates.
- App-page filtering reduces clutter and is the default for new connections.
- Each request has an 18-second timeout and clearer GitHub authentication/rate-limit errors.
- A truncated GitHub file-tree response will not delete previously found app cards.
- Large lists render incrementally.
- Importing a configuration no longer blanks a discovered app's description when its override had no description field.
- Removed the promotional hero, slogans, and decorative panels from the interface.

All functionality was tested in Chromium with simulated GitHub API responses. A live scan against your specific repository has not been performed.

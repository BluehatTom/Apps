# Tom's App Hub

A responsive, accessible personal landing page for all your web apps and coding projects. It reads GitHub repository file trees, discovers HTML apps, builds GitHub Pages launch links when possible, and lets you organize, edit, and sync your app catalog. There is **no backend and no external JavaScript dependency**.

## Start here

**Fastest way:** Open the separately provided `Toms_App_Hub.html` file in a browser. You can add GitHub repositories and custom apps immediately. For the most reliable cross-computer experience, host the project on GitHub Pages.

**Deploy to GitHub Pages:**

1. Create a repository, such as `toms-app-hub`, on GitHub. A public repository with a public Pages site works especially well for a personal launcher with public app links.
2. Upload `index.html`, `styles.css`, `app.js`, and `.nojekyll` from this package to the repository root (not into a subfolder).
3. Go to **Settings → Pages → Build and deployment**, select **Deploy from a branch**, and choose your default branch and **/(root)** folder. Save.
4. When GitHub Pages has published, open `https://YOUR-USERNAME.github.io/toms-app-hub/` (or the URL GitHub provides).
5. Click **Connect GitHub**, paste a repository URL such as `https://github.com/YOUR-USERNAME/my-apps`, and let it scan. Add as many sources as you like. Alternatively, use **GitHub sources → Browse repositories** to find a user's public repositories.
6. Use **Add an app** to create your own cards for desktop apps, external websites, or pages that were not discovered automatically.

## What you can customize

- App name, icon, category, description, tags, project stage, and launch URL.
- Favorites, hidden apps, custom ordering, search, and category filters.
- Light/dark appearance, accent color, grid/list view, and workspace name.
- Multiple GitHub sources; scan all HTML or index.html pages only.
- JSON backup/restore and publishing the configuration to GitHub for other browsers to load.

Use the pencil icon on a card to edit it. The star icon adds it to favorites. Open **All apps → Rearrange** to move cards earlier or later; choose **My order** if necessary. To recover hidden cards, open **Settings & sync → Hidden apps**.

## Save your dashboard across computers

Edits are saved to the current browser's local storage automatically. To make the organization available on other computers:

1. In **Settings & sync**, enter a fine-grained GitHub personal access token for *only* the repository in which you will save the hub configuration. Give the token **Contents: Read and write**. The token is kept only in the current page's memory, not in local storage, the JSON backup, or GitHub.
2. For **Configuration repository**, use the repository that hosts your hub (for example `YOUR-USERNAME/toms-app-hub`). Keep **Configuration file path** set to `app-hub.json`.
3. Click **Publish to GitHub**. This creates or updates the `app-hub.json` file via GitHub's Contents API, making a commit.
4. When you open the published hub on a new computer, it automatically reads `app-hub.json` alongside the website. On a computer that already has local changes, you can explicitly choose **Load site config** or **Load from GitHub**; this avoids unexpectedly replacing local edits.
5. You can also click **Export backup** and import the JSON on a different computer, without a token.

If your dashboard is hosted from a different branch, from `/docs`, or through GitHub Actions, make sure `app-hub.json` is in the *published* site's root. Otherwise use **Load from GitHub** to retrieve its contents directly from the selected repository.

**Security:** Publishing a configuration file to a public Pages repository makes the **app names, repository names, descriptions, and saved URLs** in that JSON public. It does **not** include the token. Do not publish private metadata unless you are comfortable making it public. Keep tokens out of chat, screenshots, and source files.

## GitHub permissions

- **Public repositories:** No login or token required for normal discovery and public GitHub Pages information.
- **Private repositories:** A fine-grained token with **Contents: Read** for the selected repository allows file-tree discovery. **Pages: Read** may also be needed for private GitHub Pages URL detection.
- **Publishing `app-hub.json`:** A token with **Contents: Read and write** for the configuration repository.
- Tokens are never remembered when you reload or close the page. GitHub API requests are sent directly to `https://api.github.com`.

Fine-grained tokens can be created in [GitHub personal access token settings](https://github.com/settings/personal-access-tokens).

## How app discovery works

The hub reads GitHub's repository metadata, optional Pages metadata, and the selected branch's recursive file tree. It discovers `*.html` and `*.htm` files, including index pages inside folders. Standard third-party dependency folders are skipped. Choose **Index only** for repositories with lots of unrelated HTML documentation.

When Pages is deployed from the branch root or `/docs`, the hub maps corresponding paths to published URLs. If Pages uses **GitHub Actions**, the published artifact may not have the same folder structure; only a root index URL can be inferred safely. In those cases, use the card editor to enter the correct launch URL. If a repository has no HTML, the hub creates a repository shortcut so you can track desktop and code-only projects too.

GitHub's recursive tree API can be truncated for very large repositories. The hub displays a warning in this case and scans up to 500 HTML entries per source. Public API rate limits also apply; scan thoughtfully or supply a session token if needed.

**This hub manages a catalog and optional JSON configuration.** It does not modify, deploy, build, or rewrite the underlying apps inside connected repositories.

## Keyboard and accessibility

- Use `Ctrl+K` (or `⌘K` on Mac) or `/` to open app search.
- Navigate buttons and card controls using the keyboard, including **Earlier/Later** to rearrange apps.
- Native dialogs, semantic headings, navigation landmarks, accessible form labels, visible focus styles, keyboard shortcuts, and reduced-motion support are included.

## Files

- `index.html` — GitHub Pages landing page.
- `styles.css` — responsive light/dark theme.
- `app.js` — local app catalog, GitHub API discovery, personalization and sync.
- `.nojekyll` — optional marker for simple GitHub Pages deployment.

No npm installation, build step, API key, or paid hosting is necessary for public repositories.

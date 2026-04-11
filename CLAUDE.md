## Local Testing
- When the user asks to build for local testing, always produce the bundle zip (`chrome-parcellab-demo-plugin-<version>-bundle.zip`) from the `dist/` contents and open the folder containing the zip in Finder. The user installs the extension by loading the unpacked `dist/` directory or by dragging the zip into Chrome.

# Repository Instructions

## Project
- This repository is a Chrome MV3 extension built with Vite, React, TypeScript, and Tailwind.
- The extension manifest lives in `public/manifest.json`.
- The popup app lives in `src/popup/`.
- The built extension output lives in `dist/`.

## Build
- Use `npm run build` to produce the release-ready extension bundle in `dist/`.
- Do not commit generated files from `dist/` unless the user explicitly asks for that.

## Release Workflow
- Only run a versioned release workflow after the user explicitly confirms that the current state is the final version to release.
- If the user does not specify a version number, bump the patch version.
- When releasing, update the version in:
  - `package.json`
  - `package-lock.json`
  - `public/manifest.json`
- After bumping the version:
  - run `npm run build`
  - create a zip from the contents of `dist/` with the extension files at the archive root
  - name the archive `chrome-parcellab-demo-plugin-<version>-bundle.zip`
  - commit the version bump with a conventional commit message like `chore: release <version>`
  - push the commit to `origin/main`
  - create a GitHub release tagged `<version>`
  - upload the bundle zip to that GitHub release

## Git Hygiene
- Do not include unrelated local changes in release commits.
- Do not commit local macOS metadata files such as `.DS_Store`.
- Release zip files are release assets, not source files. Do not add them to git unless the user explicitly asks.

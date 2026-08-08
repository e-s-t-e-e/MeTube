# Project Rules

## Git: commit & push
- NEVER commit or push unless the user explicitly says to. "Check", "update", "fix", "build" alone do not authorize a commit/push.
- Wait for explicit approval before any `git commit`, `git push`, `git tag`, or creating a GitHub Release.

## GitHub Actions builds
- Pushes must NOT trigger GitHub Actions builds (`.github/workflows/android-build.yml` builds on push to `main`).
- Always include `[skip ci]` in commit messages when pushing, so the build workflow is skipped.
- Only release a build directly (push without `[skip ci]`, or a GitHub Release) when the user explicitly says to release a build.

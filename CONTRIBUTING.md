# Contributing

Use the pinned pnpm version and Node 20+. Run the commands in the README before opening a PR. Keep upstream imports and fork changes in separate commits. All upstream source packages are private; only `packages/sdk` is publishable.

Cover user-visible changes with protocol or packed-artifact tests. Keep stdio separate from runtime-neutral entry points. Breaking changes belong in both migration guides. Preserve upstream notices and the v1 maintenance line.

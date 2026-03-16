# Publishing `sileo-vue`

## Prerequisites

- You need an npm account with publish access.
- You need to be logged in locally with `npm login`.
- The package name `sileo-vue` must still be available on npm, or your account must already own it.

## Verify Before Publish

From the package directory:

```bash
cd /home/sali/others/sileo-all/sileo-vue
bun install
bun run build
```

Optional local smoke test with the demo app:

```bash
cd /home/sali/others/sileo-all/sileo-vue-demo
bun install
bun run dev
```

## Update Version

Pick the correct semantic version bump and update `package.json`.

Examples:

```bash
cd /home/sali/others/sileo-all/sileo-vue
npm version patch
```

Or:

```bash
npm version minor
npm version major
```

## Publish To npm

Build first, then publish from the package folder:

```bash
cd /home/sali/others/sileo-all/sileo-vue
bun run build
npm publish --access public
```

## Confirm The Published Package

Check the package metadata:

```bash
npm view sileo-vue version
npm view sileo-vue dist-tags
```

Install it in a separate app:

```bash
npm i sileo-vue
```

## Recommended Release Checklist

1. Run `bun run build` in `/home/sali/others/sileo-all/sileo-vue`.
2. Run the demo app in `/home/sali/others/sileo-all/sileo-vue-demo`.
3. Confirm `package.json` version is correct.
4. Confirm `README.md` and package exports are current.
5. Run `npm publish --access public`.

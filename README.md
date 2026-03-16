<div align="center">
  <h1>Sileo Vue</h1>
  <p>An opinionated, physics-based toast notification library for Vue 3.</p>
  <p><a href="https://github.com/sayyam267/sileo-vue">GitHub</a> &nbsp; / &nbsp; <a href="./PUBLISHING.md">Publishing Guide</a></p>
</div>

`sileo-vue3` mirrors the runtime and API style of the React package, but exposes a Vue-first integration with `Toaster` and the `sileo` toast API.

### Installation

```bash
npm i sileo-vue3
```

### Getting Started

```vue
<script setup lang="ts">
import { Toaster, sileo } from "sileo-vue3";
import "sileo-vue3/styles.css";

function notify() {
  sileo.success({
    title: "Saved",
    description: "Your changes have been stored.",
  });
}
</script>

<template>
  <Toaster position="top-right" />
  <button type="button" @click="notify">Show toast</button>
</template>
```

### Exports

```ts
import { Toaster, sileo } from "sileo-vue3";
import "sileo-vue3/styles.css";
```

### API

- `sileo.show(options)`
- `sileo.success(options)`
- `sileo.error(options)`
- `sileo.warning(options)`
- `sileo.info(options)`
- `sileo.action(options)`
- `sileo.promise(promise, options)`
- `sileo.dismiss(id)`
- `sileo.clear(position?)`

### Local Development

```bash
bun install
bun run build
```

To test the package in the local demo app:

```bash
cd /home/sali/others/sileo-all/sileo-vue-demo
bun install
bun run dev
```

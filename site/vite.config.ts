import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
	root: resolve(__dirname),
	base: "/sileo-vue/",
	plugins: [vue(), tailwindcss()],
	build: {
		outDir: resolve(__dirname, "../site-dist"),
		emptyOutDir: true,
	},
});

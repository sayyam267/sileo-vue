<script setup lang="ts">
import { animate, stagger } from "motion";
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { sileo, Toaster, type SileoPosition } from "../src";
import { SILEO_POSITIONS } from "../src/types";

type ThemeMode = "light" | "dark";
type ToastVariant = "success" | "error" | "warning" | "info" | "promise";

const navLinks = [
	{ label: "GitHub", href: "https://github.com/sayyam267/sileo-vue" },
	{ label: "Docs", href: "https://github.com/sayyam267/sileo-vue#readme" },
	{ label: "Playground", href: "#playground" },
];

const typeOptions: Array<{ label: string; value: ToastVariant }> = [
	{ label: "Success", value: "success" },
	{ label: "Error", value: "error" },
	{ label: "Warning", value: "warning" },
	{ label: "Info", value: "info" },
	{ label: "Promise", value: "promise" },
];

const installCommand = "npm install sileo-vue3";
const position = ref<SileoPosition>("top-right");
const theme = ref<ThemeMode>("light");

const typeMeta: Record<
	ToastVariant,
	{ title: string; message: string; icon: string }
> = {
	success: {
		title: "Changes saved",
		message: "Your latest changes were saved successfully.",
		icon: "check",
	},
	error: {
		title: "Publish failed",
		message: "The release could not be published. Check your token and retry.",
		icon: "error",
	},
	warning: {
		title: "Review recommended",
		message: "A few edits still need review before this branch is ready.",
		icon: "warning",
	},
	info: {
		title: "Heads up",
		message: "You can preview position, timing, and style directly from this page.",
		icon: "info",
	},
	promise: {
		title: "Building release",
		message: "Track loading, success, and error states with one call.",
		icon: "promise",
	},
};

const positionButtons = computed(() =>
	SILEO_POSITIONS.map((value) => ({
		value,
		label: value.replace("-", " "),
	})),
);
const setupSnippet = computed(
	() => `import { Toaster, sileo } from "sileo-vue3"
import "sileo-vue3/styles.css"

<Toaster position="${position.value}" theme="${theme.value}" />`,
);

function iconNode(name: string) {
	const common = {
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		"stroke-width": "1.9",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"aria-hidden": "true",
	};

	const paths: Record<string, unknown[]> = {
		check: [h("path", { d: "M5 12.5l4.2 4.2L19 7.5" })],
		error: [
			h("circle", { cx: "12", cy: "12", r: "9" }),
			h("path", { d: "M9 9l6 6" }),
			h("path", { d: "M15 9l-6 6" }),
		],
		warning: [
			h("path", { d: "M12 4l8 15H4L12 4z" }),
			h("path", { d: "M12 9v4.5" }),
			h("path", { d: "M12 17h.01" }),
		],
		info: [
			h("circle", { cx: "12", cy: "12", r: "9" }),
			h("path", { d: "M12 10.5V16" }),
			h("path", { d: "M12 8h.01" }),
		],
		promise: [
			h("path", { d: "M12 3v4" }),
			h("path", { d: "M12 17v4" }),
			h("path", { d: "M3 12h4" }),
			h("path", { d: "M17 12h4" }),
			h("circle", { cx: "12", cy: "12", r: "4" }),
		],
		copy: [
			h("rect", { x: "9", y: "9", width: "10", height: "10", rx: "2" }),
			h("path", { d: "M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" }),
		],
		moon: [
			h("path", {
				d: "M18 14.5A6.5 6.5 0 0 1 9.5 6a7.5 7.5 0 1 0 8.5 8.5z",
			}),
		],
		sun: [
			h("circle", { cx: "12", cy: "12", r: "4" }),
			h("path", { d: "M12 2.5v2.2" }),
			h("path", { d: "M12 19.3v2.2" }),
			h("path", { d: "M4.9 4.9l1.6 1.6" }),
			h("path", { d: "M17.5 17.5l1.6 1.6" }),
			h("path", { d: "M2.5 12h2.2" }),
			h("path", { d: "M19.3 12h2.2" }),
			h("path", { d: "M4.9 19.1l1.6-1.6" }),
			h("path", { d: "M17.5 6.5l1.6-1.6" }),
		],
	};

	return h("svg", common, paths[name] ?? []);
}

function syncTheme(mode: ThemeMode) {
	theme.value = mode;
	document.documentElement.dataset.theme = mode;
	localStorage.setItem("sileo-vue-site-theme", mode);
}

function toggleTheme() {
	syncTheme(theme.value === "light" ? "dark" : "light");
}

async function copyInstall() {
	await navigator.clipboard.writeText(installCommand);
	sileo.success({
		title: "Install command copied",
		description: "Paste it into your Vue app and start using sileo-vue3.",
		position: position.value,
		duration: 2800,
	});
}

function triggerToast(type: ToastVariant) {
	if (type === "promise") {
		void sileo.promise(
			new Promise<{ id: string }>((resolve) =>
				window.setTimeout(() => resolve({ id: "v3-release" }), 1400),
			),
			{
				position: position.value,
				loading: {
					title: typeMeta.promise.title,
					description: "Bundling assets and generating types.",
				},
				success: (data) => ({
					title: "Build complete",
					description: `${data.id} is ready to publish.`,
				}),
				error: () => ({
					title: "Build failed",
					description: "The pipeline stopped before the artifacts were uploaded.",
				}),
			},
		);
		return;
	}

	sileo[type]({
		title: typeMeta[type].title,
		description: typeMeta[type].message,
		position: position.value,
		duration: 3200,
	});
}

watch(theme, (mode) => {
	document.documentElement.dataset.theme = mode;
});

onMounted(() => {
	const stored = localStorage.getItem("sileo-vue-site-theme");
	if (stored === "light" || stored === "dark") {
		syncTheme(stored);
	} else {
		syncTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
	}

	animate(
		"[data-hero]",
		{ opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"] },
		{ duration: 0.55, delay: stagger(0.06), easing: [0.22, 1, 0.36, 1] },
	);
});

onBeforeUnmount(() => {
	document.documentElement.removeAttribute("data-theme");
});
</script>

<template>
	<div class="site-shell">
		<Toaster :position="position" :theme="theme" />

		<header class="site-header">
			<a class="brand" href="#">
				<span class="brand-dot"></span>
				<span>sileo-vue</span>
			</a>

			<nav class="nav-links" aria-label="Primary">
				<a v-for="link in navLinks" :key="link.label" :href="link.href" :target="link.href.startsWith('http') ? '_blank' : undefined" rel="noreferrer">
					{{ link.label }}
				</a>
				<button type="button" class="theme-toggle" :aria-label="theme === 'light' ? 'Enable dark mode' : 'Enable light mode'" @click="toggleTheme">
					<component :is="iconNode(theme === 'light' ? 'moon' : 'sun')" />
				</button>
			</nav>
		</header>

		<main>
			<section class="hero">
				<h1 data-hero>Sileo-Vue</h1>
				<p class="hero-copy" data-hero>
					An opinionated toast component for Vue. SVG morphing, spring physics, and a
					minimal API — beautiful by default.
				</p>

				<div class="install-pill" data-hero>
					<span class="install-prefix">$</span>
					<code>{{ installCommand }}</code>
					<button type="button" class="icon-button copy-pill" aria-label="Copy install command" @click="copyInstall">
						<component :is="iconNode('copy')" />
					</button>
				</div>

				<div class="hero-actions" data-hero>
					<a class="link-pill" href="https://github.com/sayyam267/sileo-vue#readme" target="_blank" rel="noreferrer">
						Documentation
					</a>
				</div>
			</section>

			<section id="playground" class="playground">
				<div class="playground-heading">
					<p>Try it</p>
				</div>

				<div class="type-row">
					<button
						v-for="option in typeOptions"
						:key="option.value"
						type="button"
						class="type-pill"
						@click="triggerToast(option.value)"
					>
						<component :is="iconNode(typeMeta[option.value].icon)" />
						{{ option.label }}
					</button>
				</div>

				<div class="controls">
					<p class="control-title">Position</p>
					<div class="position-row">
						<button
							v-for="item in positionButtons"
							:key="item.value"
							type="button"
							class="position-pill"
							:class="{ active: position === item.value }"
							@click="position = item.value"
						>
							{{ item.label }}
						</button>
					</div>

					<pre class="code-block"><code>{{ setupSnippet }}</code></pre>
				</div>
			</section>
		</main>

		<footer class="site-footer">
			<span>Made with Vue 3</span>
			<a href="https://github.com/sayyam267/sileo-vue" target="_blank" rel="noreferrer">GitHub</a>
		</footer>
	</div>
</template>

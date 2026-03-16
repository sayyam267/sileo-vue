<script setup lang="ts">
import { computed, ref } from "vue";
import { sileo, Toaster, type SileoPosition } from "sileo-vue3";

const positions: SileoPosition[] = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

const activePosition = ref<SileoPosition>("top-right");
const installCommand = "npm i sileo-vue3";

const demoCards = computed(() => [
	{
		id: "success",
		title: "Success",
		description: "Show a polished success state with an action chip.",
		action: () =>
			sileo.success({
				title: "Saved",
				position: activePosition.value,
				description: "Your design system token update was saved cleanly.",
				button: {
					title: "View",
					onClick: () =>
						sileo.info({
							title: "Details",
							position: activePosition.value,
							description: "The success toast can trigger another toast action.",
						}),
				},
			}),
	},
	{
		id: "error",
		title: "Error",
		description: "Surface a failing request or blocked workflow instantly.",
		action: () =>
			sileo.error({
				title: "Publish failed",
				position: activePosition.value,
				description: "The registry rejected this release because the token expired.",
			}),
	},
	{
		id: "warning",
		title: "Warning",
		description: "Use autopilot timing to preview expansion and collapse.",
		action: () =>
			sileo.warning({
				title: "Unsaved changes",
				position: activePosition.value,
				description: "Your current draft still has local edits pending review.",
				autopilot: { expand: 250, collapse: 3200 },
			}),
	},
	{
		id: "action",
		title: "Action",
		description: "Drive the next step directly from the notification.",
		action: () =>
			sileo.action({
				title: "Ready for review",
				position: activePosition.value,
				description: "The branch passed checks and can be opened for review.",
				button: {
					title: "Clear all",
					onClick: () => sileo.clear(),
				},
			}),
	},
	{
		id: "promise",
		title: "Promise",
		description: "Track async work from loading into success or failure.",
		action: () =>
			sileo.promise(
				new Promise<{ id: string }>((resolve) =>
					window.setTimeout(() => resolve({ id: "artifact_204" }), 1800),
				),
				{
					position: activePosition.value,
					loading: {
						title: "Building",
						description: "Bundling the package and generating declarations.",
					},
					success: (data) => ({
						title: "Build complete",
						description: `Release candidate ${data.id} is ready to publish.`,
					}),
					error: () => ({
						title: "Build failed",
						description: "The build pipeline exited before artifacts were uploaded.",
					}),
				},
			),
	},
]);

async function copyInstall() {
	await navigator.clipboard.writeText(installCommand);
	sileo.success({
		title: "Copied",
		position: activePosition.value,
		description: "Install command copied to your clipboard.",
	});
}

function previewPosition(position: SileoPosition) {
	activePosition.value = position;
	sileo.info({
		title: "Position updated",
		position,
		description: `New toasts will now appear at ${position}.`,
	});
}
</script>

<template>
	<div class="min-h-screen bg-transparent text-white">
		<Toaster :position="activePosition" theme="dark" />

		<div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-10 pt-6 sm:px-8">
			<header class="mb-10 flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div class="max-w-3xl">
						<p class="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
							Vue toast playground
						</p>
						<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
							Test every Sileo Vue state in one page.
						</h1>
						<p class="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
							A GitHub Pages-ready playground for
							<span class="font-semibold text-white">sileo-vue3</span>
							with quick position switching, async demos, and install-ready snippets.
						</p>
					</div>

					<div class="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm text-cyan-50">
						<div class="text-white/60">Current position</div>
						<div class="mt-1 text-xl font-semibold">{{ activePosition }}</div>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<button
						v-for="position in positions"
						:key="position"
						type="button"
						class="rounded-2xl border px-4 py-3 text-left text-sm transition duration-200"
						:class="
							activePosition === position
								? 'border-cyan-300 bg-cyan-300 text-neutral-950 shadow-[0_10px_30px_rgba(34,211,238,0.28)]'
								: 'border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10'
						"
						@click="previewPosition(position)"
					>
						<div class="font-medium">{{ position }}</div>
						<div class="mt-1 text-xs opacity-70">Preview future toasts here</div>
					</button>
				</div>
			</header>

			<main class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
				<section class="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
					<div class="mb-6 flex items-center justify-between gap-4">
						<div>
							<p class="text-sm font-medium text-white/60">Live demos</p>
							<h2 class="text-2xl font-semibold text-white">Toast variants</h2>
						</div>
						<button
							type="button"
							class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
							@click="sileo.clear()"
						>
							Clear all
						</button>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<article
							v-for="card in demoCards"
							:key="card.id"
							class="group rounded-[1.6rem] border border-white/10 bg-neutral-950/50 p-5 transition duration-200 hover:border-cyan-300/30 hover:bg-neutral-950/70"
						>
							<div class="flex items-start justify-between gap-4">
								<div>
									<h3 class="text-xl font-semibold text-white">{{ card.title }}</h3>
									<p class="mt-2 text-sm leading-6 text-white/60">
										{{ card.description }}
									</p>
								</div>
								<div class="h-3 w-3 rounded-full bg-cyan-300/80 shadow-[0_0_20px_rgba(103,232,249,0.6)]"></div>
							</div>

							<button
								type="button"
								class="mt-6 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:translate-y-[-1px] hover:bg-cyan-200"
								@click="card.action()"
							>
								Trigger {{ card.title }}
							</button>
						</article>
					</div>
				</section>

				<section class="flex flex-col gap-6">
					<div class="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
						<p class="text-sm font-medium text-white/60">Install</p>
						<h2 class="mt-2 text-2xl font-semibold text-white">Start using it</h2>
						<p class="mt-3 text-sm leading-6 text-white/65">
							Copy the install command, drop in the toaster, and use the same runtime API from this page.
						</p>

						<div class="mt-6 rounded-[1.5rem] border border-white/10 bg-neutral-950/80 p-4">
							<div class="flex items-center justify-between gap-3">
								<code class="overflow-x-auto text-sm text-cyan-200">{{ installCommand }}</code>
								<button
									type="button"
									class="shrink-0 rounded-full bg-cyan-300 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-cyan-200"
									@click="copyInstall"
								>
									Copy
								</button>
							</div>
						</div>
					</div>

					<div class="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-xl sm:p-8">
						<p class="text-sm font-medium text-white/60">Usage</p>
						<h2 class="mt-2 text-2xl font-semibold text-white">Minimal setup</h2>
						<pre class="mt-5 overflow-x-auto rounded-[1.5rem] border border-white/10 bg-neutral-950/85 p-4 text-sm leading-6 text-white/80"><code>import { Toaster, sileo } from "sileo-vue3";
import "sileo-vue3/styles.css";

// in your root component
&lt;Toaster position="top-right" /&gt;

sileo.success({
  title: "Saved",
  description: "Your changes have been stored."
});</code></pre>
					</div>
				</section>
			</main>

			<footer class="mt-10 border-t border-white/10 pt-6 text-sm text-white/45">
				Made by Sayyam Ali
			</footer>
		</div>
	</div>
</template>

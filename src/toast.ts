import {
	computed,
	defineComponent,
	Fragment,
	h,
	onBeforeUnmount,
	onMounted,
	ref,
	type CSSProperties,
	type PropType,
	type VNodeChild,
	watch,
} from "vue";
import {
	AUTO_COLLAPSE_DELAY,
	AUTO_EXPAND_DELAY,
	DEFAULT_TOAST_DURATION,
	EXIT_DURATION,
} from "./constants";
import { Sileo } from "./sileo";
import type { SileoOptions, SileoPosition, SileoState } from "./types";

const pillAlign = (pos: SileoPosition) =>
	pos.includes("right") ? "right" : pos.includes("center") ? "center" : "left";
const expandDir = (pos: SileoPosition) =>
	pos.startsWith("top") ? ("bottom" as const) : ("top" as const);

type InternalSileoOptions = Omit<SileoOptions, "description" | "icon"> & {
	id?: string;
	state?: SileoState;
	description?: unknown;
	icon?: unknown | null;
};

interface SileoItem extends InternalSileoOptions {
	id: string;
	instanceId: string;
	exiting?: boolean;
	autoExpandDelayMs?: number;
	autoCollapseDelayMs?: number;
}

type SileoOffsetValue = number | string;
type SileoOffsetConfig = Partial<
	Record<"top" | "right" | "bottom" | "left", SileoOffsetValue>
>;

export interface SileoToasterProps {
	position?: SileoPosition;
	offset?: SileoOffsetValue | SileoOffsetConfig;
	options?: Partial<SileoOptions>;
	theme?: "light" | "dark" | "system";
}

type SileoListener = (toasts: SileoItem[]) => void;

const store = {
	toasts: [] as SileoItem[],
	listeners: new Set<SileoListener>(),
	position: "top-right" as SileoPosition,
	options: undefined as Partial<SileoOptions> | undefined,

	emit() {
		for (const fn of this.listeners) fn(this.toasts);
	},

	update(fn: (prev: SileoItem[]) => SileoItem[]) {
		this.toasts = fn(this.toasts);
		this.emit();
	},
};

let idCounter = 0;
const generateId = () =>
	`${++idCounter}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const timeoutKey = (toast: SileoItem) => `${toast.id}:${toast.instanceId}`;

const dismissToast = (id: string) => {
	const item = store.toasts.find((toast) => toast.id === id);
	if (!item || item.exiting) return;

	store.update((prev) =>
		prev.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast)),
	);

	setTimeout(() => {
		store.update((prev) => prev.filter((toast) => toast.id !== id));
	}, EXIT_DURATION);
};

const resolveAutopilot = (
	opts: InternalSileoOptions,
	duration: number | null,
): { expandDelayMs?: number; collapseDelayMs?: number } => {
	if (opts.autopilot === false || !duration || duration <= 0) return {};
	const config = typeof opts.autopilot === "object" ? opts.autopilot : undefined;
	const clamp = (value: number) => Math.min(duration, Math.max(0, value));
	return {
		expandDelayMs: clamp(config?.expand ?? AUTO_EXPAND_DELAY),
		collapseDelayMs: clamp(config?.collapse ?? AUTO_COLLAPSE_DELAY),
	};
};

const mergeOptions = (options: InternalSileoOptions) => ({
	...store.options,
	...options,
	styles: { ...store.options?.styles, ...options.styles },
});

const buildSileoItem = (
	merged: InternalSileoOptions,
	id: string,
	fallbackPosition?: SileoPosition,
): SileoItem => {
	const duration = merged.duration ?? DEFAULT_TOAST_DURATION;
	const auto = resolveAutopilot(merged, duration);
	return {
		...merged,
		id,
		instanceId: generateId(),
		position: merged.position ?? fallbackPosition ?? store.position,
		autoExpandDelayMs: auto.expandDelayMs,
		autoCollapseDelayMs: auto.collapseDelayMs,
	};
};

const createToast = (options: InternalSileoOptions) => {
	const live = store.toasts.filter((toast) => !toast.exiting);
	const merged = mergeOptions(options);
	const id = merged.id ?? "sileo-default";
	const prev = live.find((toast) => toast.id === id);
	const item = buildSileoItem(merged, id, prev?.position);

	if (prev) {
		store.update((list) => list.map((toast) => (toast.id === id ? item : toast)));
	} else {
		store.update((list) => [...list.filter((toast) => toast.id !== id), item]);
	}

	return { id, duration: merged.duration ?? DEFAULT_TOAST_DURATION };
};

const updateToast = (id: string, options: InternalSileoOptions) => {
	const existing = store.toasts.find((toast) => toast.id === id);
	if (!existing) return;
	const item = buildSileoItem(mergeOptions(options), id, existing.position);
	store.update((prev) => prev.map((toast) => (toast.id === id ? item : toast)));
};

export interface SileoPromiseOptions<T = unknown> {
	loading: SileoOptions;
	success: SileoOptions | ((data: T) => SileoOptions);
	error: SileoOptions | ((err: unknown) => SileoOptions);
	action?: SileoOptions | ((data: T) => SileoOptions);
	position?: SileoPosition;
}

export const sileo = {
	show: (opts: SileoOptions) => createToast({ ...opts, state: opts.type }).id,
	success: (opts: SileoOptions) => createToast({ ...opts, state: "success" }).id,
	error: (opts: SileoOptions) => createToast({ ...opts, state: "error" }).id,
	warning: (opts: SileoOptions) => createToast({ ...opts, state: "warning" }).id,
	info: (opts: SileoOptions) => createToast({ ...opts, state: "info" }).id,
	action: (opts: SileoOptions) => createToast({ ...opts, state: "action" }).id,
	promise: <T,>(
		promise: Promise<T> | (() => Promise<T>),
		opts: SileoPromiseOptions<T>,
	): Promise<T> => {
		const { id } = createToast({
			...opts.loading,
			state: "loading",
			duration: null,
			position: opts.position,
		});

		const resolved = typeof promise === "function" ? promise() : promise;

		resolved
			.then((data) => {
				if (opts.action) {
					const actionOpts =
						typeof opts.action === "function" ? opts.action(data) : opts.action;
					updateToast(id, { ...actionOpts, state: "action", id });
				} else {
					const successOpts =
						typeof opts.success === "function" ? opts.success(data) : opts.success;
					updateToast(id, { ...successOpts, state: "success", id });
				}
			})
			.catch((err) => {
				const errorOpts =
					typeof opts.error === "function" ? opts.error(err) : opts.error;
				updateToast(id, { ...errorOpts, state: "error", id });
			});

		return resolved;
	},
	dismiss: dismissToast,
	clear: (position?: SileoPosition) =>
		store.update((prev) =>
			position ? prev.filter((toast) => toast.position !== position) : [],
		),
};

const THEME_FILLS = {
	light: "#1a1a1a",
	dark: "#f2f2f2",
} as const;

const resolveSystemTheme = () => {
	if (typeof window === "undefined") return "light" as const;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? ("dark" as const)
		: ("light" as const);
};

export const Toaster = defineComponent({
	name: "Toaster",
	props: {
		position: {
			type: String as PropType<SileoPosition>,
			default: "top-right",
		},
		offset: {
			type: [Number, String, Object] as PropType<SileoOffsetValue | SileoOffsetConfig>,
			default: undefined,
		},
		options: {
			type: Object as PropType<Partial<SileoOptions>>,
			default: undefined,
		},
		theme: {
			type: String as PropType<"light" | "dark" | "system">,
			default: undefined,
		},
	},
	setup(props, { slots }) {
		let listener: SileoListener | null = null;
		const resolvedTheme = ref<"light" | "dark">(
			props.theme === "light" || props.theme === "dark"
				? props.theme
				: resolveSystemTheme(),
		);
		const toasts = ref<SileoItem[]>(store.toasts);
		const activeId = ref<string>();
		const hover = ref(false);
		const listRef = ref<SileoItem[]>(store.toasts);
		const latestRef = ref<string>();
		const timers = new Map<string, number>();
		const handlerCache = new Map<
			string,
			{
				enter: (event: MouseEvent) => void;
				leave: (event: MouseEvent) => void;
				dismiss: () => void;
			}
		>();

		const clearAllTimers = () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		};

		const schedule = (items: SileoItem[]) => {
			if (hover.value) return;

			for (const item of items) {
				if (item.exiting) continue;
				const key = timeoutKey(item);
				if (timers.has(key)) continue;
				if (item.duration === null) continue;
				const duration = item.duration ?? DEFAULT_TOAST_DURATION;
				if (duration <= 0) continue;
				timers.set(
					key,
					window.setTimeout(() => dismissToast(item.id), duration),
				);
			}
		};

		watch(
			() => [props.position, props.options] as const,
			() => {
				store.position = props.position;
				store.options = props.options;
			},
			{ immediate: true },
		);

		onMounted(() => {
			listener = (next) => {
				toasts.value = next;
			};
			store.listeners.add(listener);
		});

		let media: MediaQueryList | null = null;
		let handleTheme: ((event: MediaQueryListEvent) => void) | null = null;

		if (
			typeof window !== "undefined" &&
			(props.theme === "system" || props.theme === undefined)
		) {
			media = window.matchMedia("(prefers-color-scheme: dark)");
			handleTheme = (event: MediaQueryListEvent) => {
				resolvedTheme.value = event.matches ? "dark" : "light";
			};
			media.addEventListener("change", handleTheme);
		}

		onBeforeUnmount(() => {
			if (listener) {
				store.listeners.delete(listener);
			}
			clearAllTimers();
			if (media && handleTheme) {
				media.removeEventListener("change", handleTheme);
			}
		});

		watch(
			toasts,
			(next) => {
				listRef.value = next;
				const toastKeys = new Set(next.map(timeoutKey));
				const toastIds = new Set(next.map((toast) => toast.id));

				for (const [key, timer] of timers) {
					if (!toastKeys.has(key)) {
						clearTimeout(timer);
						timers.delete(key);
					}
				}

				for (const id of handlerCache.keys()) {
					if (!toastIds.has(id)) handlerCache.delete(id);
				}

				schedule(next);
			},
			{ immediate: true },
		);

		const latest = computed(() => {
			for (let index = toasts.value.length - 1; index >= 0; index -= 1) {
				if (!toasts.value[index].exiting) return toasts.value[index].id;
			}
			return undefined;
		});

		watch(
			latest,
			(next) => {
				latestRef.value = next;
				activeId.value = next;
			},
			{ immediate: true },
		);

		const getHandlers = (toastId: string) => {
			const cached = handlerCache.get(toastId);
			if (cached) return cached;

			const handlers = {
				enter: (_event: MouseEvent) => {
					if (activeId.value !== toastId) activeId.value = toastId;
					if (!hover.value) {
						hover.value = true;
						clearAllTimers();
					}
				},
				leave: (_event: MouseEvent) => {
					if (activeId.value !== latestRef.value) activeId.value = latestRef.value;
					if (!hover.value) return;
					hover.value = false;
					schedule(listRef.value);
				},
				dismiss: () => dismissToast(toastId),
			};

			handlerCache.set(toastId, handlers);
			return handlers;
		};

		const getViewportStyle = (pos: SileoPosition): CSSProperties | undefined => {
			if (props.offset === undefined) return undefined;

			const offset =
				typeof props.offset === "object"
					? props.offset
					: {
							top: props.offset,
							right: props.offset,
							bottom: props.offset,
							left: props.offset,
					  };

			const style: CSSProperties = {};
			const px = (value: SileoOffsetValue) =>
				typeof value === "number" ? `${value}px` : value;

			if (pos.startsWith("top") && offset.top) style.top = px(offset.top);
			if (pos.startsWith("bottom") && offset.bottom) style.bottom = px(offset.bottom);
			if (pos.endsWith("left") && offset.left) style.left = px(offset.left);
			if (pos.endsWith("right") && offset.right) style.right = px(offset.right);

			return style;
		};

		const activePositions = computed(() => {
			const map = new Map<SileoPosition, SileoItem[]>();
			for (const toast of toasts.value) {
				const pos = toast.position ?? props.position;
				const existing = map.get(pos);
				if (existing) {
					existing.push(toast);
				} else {
					map.set(pos, [toast]);
				}
			}
			return map;
		});

		return () =>
			h(Fragment, [
				...(slots.default?.() ?? []),
				...Array.from(activePositions.value, ([pos, items]) => {
					const pill = pillAlign(pos);
					const expand = expandDir(pos);

					return h(
						"section",
						{
							key: pos,
							"data-sileo-viewport": "",
							"data-position": pos,
							"data-theme": props.theme ? resolvedTheme.value : undefined,
							"aria-live": "polite",
							style: getViewportStyle(pos),
						},
						items.map((item) => {
							const handlers = getHandlers(item.id);
							return h(Sileo, {
								key: item.id,
								id: item.id,
								state: item.state,
								title: item.title,
								description: item.description as VNodeChild,
								position: pill,
								expand,
								icon: item.icon as VNodeChild,
								fill: item.fill ?? (props.theme ? THEME_FILLS[resolvedTheme.value] : undefined),
								styles: item.styles,
								button: item.button,
								roundness: item.roundness,
								exiting: item.exiting,
								autoExpandDelayMs: item.autoExpandDelayMs,
								autoCollapseDelayMs: item.autoCollapseDelayMs,
								refreshKey: item.instanceId,
								canExpand: activeId.value === undefined || activeId.value === item.id,
								onMouseEnter: handlers.enter,
								onMouseLeave: handlers.leave,
								onDismiss: handlers.dismiss,
							});
						}),
					);
				}),
			]);
	},
});

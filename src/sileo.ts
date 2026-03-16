import {
	computed,
	defineComponent,
	h,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
	type CSSProperties,
	type PropType,
	type VNodeChild,
	watch,
} from "vue";
import {
	BLUR_RATIO,
	DEFAULT_ROUNDNESS,
	HEADER_EXIT_MS,
	HEIGHT,
	MIN_EXPAND_RATIO,
	PILL_PADDING,
	SWAP_COLLAPSE_MS,
	WIDTH,
} from "./constants";
import { ArrowRight, Check, CircleAlert, LifeBuoy, LoaderCircle, X } from "./icons";
import type { SileoButton, SileoState, SileoStyles } from "./types";

type State = SileoState;

interface View {
	title?: string;
	description?: unknown;
	state: State;
	icon?: unknown | null;
	styles?: SileoStyles;
	button?: SileoButton;
	fill: string;
}

const STATE_ICON: Record<State, () => VNodeChild> = {
	success: Check,
	loading: () =>
		LoaderCircle({ "aria-hidden": "true", class: "sileo-icon-spin" } as const),
	error: X,
	warning: CircleAlert,
	info: LifeBuoy,
	action: ArrowRight,
};

export const Sileo = defineComponent({
	name: "Sileo",
	props: {
		id: { type: String, required: true },
		fill: { type: String, default: "#FFFFFF" },
		state: { type: String as PropType<State>, default: "success" },
		title: { type: String, default: undefined },
		description: {
			type: [String, Object, Array, Function] as PropType<VNodeChild | string>,
			default: undefined,
		},
		position: {
			type: String as PropType<"left" | "center" | "right">,
			default: "left",
		},
		expand: {
			type: String as PropType<"top" | "bottom">,
			default: "bottom",
		},
		className: { type: String, default: undefined },
		icon: {
			type: [String, Object, Array, Function] as PropType<VNodeChild | null>,
			default: undefined,
		},
		styles: { type: Object as PropType<SileoStyles>, default: undefined },
		button: { type: Object as PropType<SileoButton>, default: undefined },
		roundness: { type: Number, default: undefined },
		exiting: { type: Boolean, default: false },
		autoExpandDelayMs: { type: Number, default: undefined },
		autoCollapseDelayMs: { type: Number, default: undefined },
		canExpand: { type: Boolean, default: undefined },
		interruptKey: { type: String, default: undefined },
		refreshKey: { type: String, default: undefined },
		onMouseEnter: {
			type: Function as PropType<(event: MouseEvent) => void>,
			default: undefined,
		},
		onMouseLeave: {
			type: Function as PropType<(event: MouseEvent) => void>,
			default: undefined,
		},
		onDismiss: { type: Function as PropType<() => void>, default: undefined },
	},
	setup(props) {
		const buildView = (): View => ({
			title: props.title ?? props.state,
			description: props.description as unknown,
			state: props.state,
			icon: props.icon as unknown,
			styles: props.styles,
			button: props.button,
			fill: props.fill,
		});

		const view = ref<View>(buildView());
		const applied = ref(props.refreshKey);
		const isExpanded = ref(false);
		const ready = ref(false);
		const pillWidth = ref(0);
		const contentHeight = ref(0);
		const lastRefreshKey = ref(props.refreshKey);
		const pending = ref<{ key?: string; payload: View } | null>(null);
		const swapTimer = ref<number | null>(null);
		const headerExitTimer = ref<number | null>(null);
		const autoExpandTimer = ref<number | null>(null);
		const autoCollapseTimer = ref<number | null>(null);
		const headerLayer = ref<{
			current: { key: string; view: View };
			prev: { key: string; view: View } | null;
		}>({
			current: {
				key: `${view.value.state}-${view.value.title ?? ""}`,
				view: view.value,
			},
			prev: null,
		});

		const innerRef = ref<HTMLDivElement | null>(null);
		const headerRef = ref<HTMLDivElement | null>(null);
		const contentRef = ref<HTMLDivElement | null>(null);
		const buttonRef = ref<HTMLButtonElement | null>(null);
		const pillObserved = ref<Element | null>(null);
		const pillResizeObserver = ref<ResizeObserver | null>(null);
		const contentResizeObserver = ref<ResizeObserver | null>(null);
		const pillRaf = ref(0);
		const headerPad = ref<number | null>(null);
		const pointerStart = ref<number | null>(null);
		const frozenExpanded = ref(HEIGHT * MIN_EXPAND_RATIO);

		const hasDesc = computed(
			() => Boolean(view.value.description) || Boolean(view.value.button),
		);
		const isLoading = computed(() => view.value.state === "loading");
		const allowExpand = computed(() =>
			isLoading.value
				? false
				: (props.canExpand ?? (!props.interruptKey || props.interruptKey === props.id)),
		);
		const open = computed(
			() => hasDesc.value && isExpanded.value && !isLoading.value,
		);
		const headerKey = computed(
			() => `${view.value.state}-${view.value.title ?? ""}`,
		);
		const filterId = computed(() => `sileo-gooey-${props.id}`);
		const resolvedRoundness = computed(() =>
			Math.max(0, props.roundness ?? DEFAULT_ROUNDNESS),
		);
		const blur = computed(() => resolvedRoundness.value * BLUR_RATIO);

		const cleanupTimer = (timer: typeof autoExpandTimer) => {
			if (timer.value !== null) {
				clearTimeout(timer.value);
				timer.value = null;
			}
		};

		const measurePill = () => {
			const el = innerRef.value;
			const header = headerRef.value;
			if (!el || !header) return;
			if (headerPad.value === null) {
				const cs = getComputedStyle(header);
				headerPad.value =
					parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
			}
			const width = el.scrollWidth + (headerPad.value ?? 0) + PILL_PADDING;
			if (width > PILL_PADDING) pillWidth.value = width;
		};

		const measureContent = () => {
			const el = contentRef.value;
			if (!el) return;
			contentHeight.value = el.scrollHeight;
		};

		onMounted(() => {
			requestAnimationFrame(() => {
				ready.value = true;
			});

			nextTick(() => {
				measurePill();
				measureContent();
			});

			pillResizeObserver.value = new ResizeObserver(() => {
				cancelAnimationFrame(pillRaf.value);
				pillRaf.value = requestAnimationFrame(measurePill);
			});

			watch(
				innerRef,
				(el) => {
					if (!pillResizeObserver.value || !el) return;
					if (pillObserved.value && pillObserved.value !== el) {
						pillResizeObserver.value.unobserve(pillObserved.value);
					}
					pillResizeObserver.value.observe(el);
					pillObserved.value = el;
				},
				{ immediate: true },
			);
		});

		watch(
			hasDesc,
			(next) => {
				contentResizeObserver.value?.disconnect();
				contentResizeObserver.value = null;
				if (!next) {
					contentHeight.value = 0;
					return;
				}
				nextTick(() => {
					measureContent();
					const el = contentRef.value;
					if (!el) return;
					contentResizeObserver.value = new ResizeObserver(() =>
						requestAnimationFrame(measureContent),
					);
					contentResizeObserver.value.observe(el);
				});
			},
			{ immediate: true },
		);

		watch(headerKey, (nextKey) => {
			if (headerLayer.value.current.key === nextKey) {
				headerLayer.value = {
					...headerLayer.value,
					current: { key: nextKey, view: view.value },
				};
				return;
			}
			headerLayer.value = {
				prev: headerLayer.value.current,
				current: { key: nextKey, view: view.value },
			};
		});

		watch(
			() => headerLayer.value.prev,
			(prev) => {
				if (!prev) return;
				cleanupTimer(headerExitTimer);
				headerExitTimer.value = window.setTimeout(() => {
					headerLayer.value = { ...headerLayer.value, prev: null };
					headerExitTimer.value = null;
				}, HEADER_EXIT_MS);
			},
		);

		watch(
			() => props.fill,
			(fill) => {
				if (view.value.fill !== fill) view.value = { ...view.value, fill };
			},
		);

		watch(
			[
				() => props.refreshKey,
				open,
				() => props.title,
				() => props.description,
				() => props.state,
				() => props.icon,
				() => props.styles,
				() => props.button,
				() => props.fill,
			],
			() => {
				const next = buildView();
				if (props.refreshKey === undefined) {
					view.value = next;
					applied.value = undefined;
					pending.value = null;
					lastRefreshKey.value = props.refreshKey;
					return;
				}

				if (lastRefreshKey.value === props.refreshKey) return;
				lastRefreshKey.value = props.refreshKey;

				cleanupTimer(swapTimer);

				if (open.value) {
					pending.value = { key: props.refreshKey, payload: next };
					isExpanded.value = false;
					swapTimer.value = window.setTimeout(() => {
						swapTimer.value = null;
						if (!pending.value) return;
						view.value = pending.value.payload;
						applied.value = pending.value.key;
						pending.value = null;
					}, SWAP_COLLAPSE_MS);
				} else {
					pending.value = null;
					view.value = next;
					applied.value = props.refreshKey;
				}
			},
			{ immediate: true },
		);

		watch(
			[
				() => props.autoExpandDelayMs,
				() => props.autoCollapseDelayMs,
				hasDesc,
				allowExpand,
				() => props.exiting,
				applied,
			],
			() => {
				if (!hasDesc.value) return;

				cleanupTimer(autoExpandTimer);
				cleanupTimer(autoCollapseTimer);

				if (props.exiting || !allowExpand.value) {
					isExpanded.value = false;
					return;
				}

				if (props.autoExpandDelayMs == null && props.autoCollapseDelayMs == null) {
					return;
				}

				const expandDelay = props.autoExpandDelayMs ?? 0;
				const collapseDelay = props.autoCollapseDelayMs ?? 0;

				if (expandDelay > 0) {
					autoExpandTimer.value = window.setTimeout(() => {
						isExpanded.value = true;
					}, expandDelay);
				} else {
					isExpanded.value = true;
				}

				if (collapseDelay > 0) {
					autoCollapseTimer.value = window.setTimeout(() => {
						isExpanded.value = false;
					}, collapseDelay);
				}
			},
			{ immediate: true },
		);

		const minExpanded = computed(() => HEIGHT * MIN_EXPAND_RATIO);
		const rawExpanded = computed(() =>
			hasDesc.value
				? Math.max(minExpanded.value, HEIGHT + contentHeight.value)
				: minExpanded.value,
		);
		const expanded = computed(() => {
			if (open.value) frozenExpanded.value = rawExpanded.value;
			return open.value ? rawExpanded.value : frozenExpanded.value;
		});
		const svgHeight = computed(() =>
			hasDesc.value ? Math.max(expanded.value, minExpanded.value) : HEIGHT,
		);
		const expandedContent = computed(() => Math.max(0, expanded.value - HEIGHT));
		const resolvedPillWidth = computed(() => Math.max(pillWidth.value || HEIGHT, HEIGHT));
		const pillHeight = computed(() => HEIGHT + blur.value * 3);
		const pillX = computed(() => {
			if (props.position === "right") return WIDTH - resolvedPillWidth.value;
			if (props.position === "center") return (WIDTH - resolvedPillWidth.value) / 2;
			return 0;
		});
		const viewBox = computed(() => `0 0 ${WIDTH} ${svgHeight.value}`);
		const canvasStyle = computed<CSSProperties>(() => ({
			filter: `url(#${filterId.value})`,
		}));
		const rootStyle = computed<CSSProperties & Record<string, string>>(() => ({
			"--_h": `${open.value ? expanded.value : HEIGHT}px`,
			"--_pw": `${resolvedPillWidth.value}px`,
			"--_px": `${pillX.value}px`,
			"--_ht": `translateY(${open.value ? (props.expand === "bottom" ? 3 : -3) : 0}px) scale(${open.value ? 0.9 : 1})`,
			"--_co": `${open.value ? 1 : 0}`,
		}));
		const pillRectStyle = computed<CSSProperties>(() => ({
			transition: ready.value
				? "x 600ms var(--sileo-spring-easing), width 600ms var(--sileo-spring-easing), height 600ms var(--sileo-spring-easing)"
				: "none",
		}));
		const bodyRectStyle = computed<CSSProperties>(() => ({
			transition:
				"height 600ms var(--sileo-spring-easing), opacity 360ms ease",
		}));

		const onTransitionEnd = (event: TransitionEvent) => {
			if (event.propertyName !== "height" && event.propertyName !== "transform") {
				return;
			}
			if (open.value || !pending.value) return;
			cleanupTimer(swapTimer);
			view.value = pending.value.payload;
			applied.value = pending.value.key;
			pending.value = null;
		};

		const swipeHandlers = {
			onMove: (event: PointerEvent) => {
				const el = buttonRef.value;
				if (pointerStart.value === null || !el) return;
				const dy = event.clientY - pointerStart.value;
				const sign = dy > 0 ? 1 : -1;
				const clamped = Math.min(Math.abs(dy), 20) * sign;
				el.style.transform = `translateY(${clamped}px)`;
			},
			onUp: (event: PointerEvent) => {
				const el = buttonRef.value;
				if (pointerStart.value === null || !el) return;
				const dy = event.clientY - pointerStart.value;
				pointerStart.value = null;
				el.style.transform = "";
				el.removeEventListener("pointermove", swipeHandlers.onMove);
				el.removeEventListener("pointerup", swipeHandlers.onUp);
				if (Math.abs(dy) > 30) props.onDismiss?.();
			},
		};

		const handlePointerDown = (event: PointerEvent) => {
			if (props.exiting || !props.onDismiss) return;
			const target = event.target as HTMLElement | null;
			if (target?.closest("[data-sileo-button]")) return;
			pointerStart.value = event.clientY;
			const el = buttonRef.value;
			if (!el) return;
			el.setPointerCapture(event.pointerId);
			el.addEventListener("pointermove", swipeHandlers.onMove, { passive: true });
			el.addEventListener("pointerup", swipeHandlers.onUp, { passive: true });
		};

		onBeforeUnmount(() => {
			cancelAnimationFrame(pillRaf.value);
			pillResizeObserver.value?.disconnect();
			contentResizeObserver.value?.disconnect();
			cleanupTimer(headerExitTimer);
			cleanupTimer(autoExpandTimer);
			cleanupTimer(autoCollapseTimer);
			cleanupTimer(swapTimer);
			const el = buttonRef.value;
			if (el) {
				el.removeEventListener("pointermove", swipeHandlers.onMove);
				el.removeEventListener("pointerup", swipeHandlers.onUp);
			}
		});

		return () =>
			h(
				"button",
				{
					ref: buttonRef,
					type: "button",
					"data-sileo-toast": "",
					"data-ready": String(ready.value),
					"data-expanded": String(open.value),
					"data-exiting": String(props.exiting),
					"data-edge": props.expand,
					"data-position": props.position,
					"data-state": view.value.state,
					class: props.className,
					style: rootStyle.value,
					onMouseenter: (event: MouseEvent) => {
						props.onMouseEnter?.(event);
						if (hasDesc.value) isExpanded.value = true;
					},
					onMouseleave: (event: MouseEvent) => {
						props.onMouseLeave?.(event);
						isExpanded.value = false;
					},
					onTransitionend: onTransitionEnd,
					onPointerdown: handlePointerDown,
				},
				[
					h("div", { "data-sileo-canvas": "", "data-edge": props.expand, style: canvasStyle.value }, [
						h("svg", { "data-sileo-svg": "", width: WIDTH, height: svgHeight.value, viewBox: viewBox.value }, [
							h("title", "Sileo Notification"),
							h("defs", [
								h(
									"filter",
									{
										id: filterId.value,
										x: "-20%",
										y: "-20%",
										width: "140%",
										height: "140%",
										colorInterpolationFilters: "sRGB",
									},
									[
										h("feGaussianBlur", {
											in: "SourceGraphic",
											stdDeviation: blur.value,
											result: "blur",
										}),
										h("feColorMatrix", {
											in: "blur",
											mode: "matrix",
											values:
												"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10",
											result: "goo",
										}),
										h("feComposite", {
											in: "SourceGraphic",
											in2: "goo",
											operator: "atop",
										}),
									],
								),
							]),
							h("rect", {
								"data-sileo-pill": "",
								rx: resolvedRoundness.value,
								ry: resolvedRoundness.value,
								fill: view.value.fill,
								x: pillX.value,
								width: resolvedPillWidth.value,
								height: open.value ? pillHeight.value : HEIGHT,
								style: pillRectStyle.value,
							}),
							h("rect", {
								"data-sileo-body": "",
								y: HEIGHT,
								width: WIDTH,
								rx: resolvedRoundness.value,
								ry: resolvedRoundness.value,
								fill: view.value.fill,
								height: open.value ? expandedContent.value : 0,
								opacity: open.value ? 1 : 0,
								style: bodyRectStyle.value,
							}),
						]),
					]),
					h("div", { ref: headerRef, "data-sileo-header": "", "data-edge": props.expand }, [
						h("div", { "data-sileo-header-stack": "" }, [
							h(
								"div",
								{
									ref: innerRef,
									key: headerLayer.value.current.key,
									"data-sileo-header-inner": "",
									"data-layer": "current",
								},
								[
									h(
										"div",
										{
											"data-sileo-badge": "",
											"data-state": headerLayer.value.current.view.state,
											class: headerLayer.value.current.view.styles?.badge,
										},
										[
											(headerLayer.value.current.view.icon as VNodeChild) ??
												STATE_ICON[headerLayer.value.current.view.state](),
										],
									),
									h(
										"span",
										{
											"data-sileo-title": "",
											"data-state": headerLayer.value.current.view.state,
											class: headerLayer.value.current.view.styles?.title,
										},
										headerLayer.value.current.view.title,
									),
								],
							),
							headerLayer.value.prev
								? h(
										"div",
										{
											key: headerLayer.value.prev.key,
											"data-sileo-header-inner": "",
											"data-layer": "prev",
											"data-exiting": "true",
										},
										[
											h(
												"div",
												{
													"data-sileo-badge": "",
													"data-state": headerLayer.value.prev.view.state,
													class: headerLayer.value.prev.view.styles?.badge,
												},
												[
													(headerLayer.value.prev.view.icon as VNodeChild) ??
														STATE_ICON[headerLayer.value.prev.view.state](),
												],
											),
											h(
												"span",
												{
													"data-sileo-title": "",
													"data-state": headerLayer.value.prev.view.state,
													class: headerLayer.value.prev.view.styles?.title,
												},
												headerLayer.value.prev.view.title,
											),
										],
								  )
								: null,
						]),
					]),
					hasDesc.value
						? h("div", { "data-sileo-content": "", "data-edge": props.expand, "data-visible": String(open.value) }, [
								h(
									"div",
									{
										ref: contentRef,
										"data-sileo-description": "",
										class: view.value.styles?.description,
									},
									[
										view.value.description as VNodeChild,
										view.value.button
											? h(
													"a",
													{
														href: "#",
														type: "button",
														"data-sileo-button": "",
														"data-state": view.value.state,
														class: view.value.styles?.button,
														onClick: (event: MouseEvent) => {
															event.preventDefault();
															event.stopPropagation();
															view.value.button?.onClick();
														},
													},
													view.value.button.title,
											  )
											: null,
									],
								),
						  ])
						: null,
				],
			);
	},
});

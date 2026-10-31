// content/index.ts
import { render } from "@solidjs/web";
import { createSignal } from "solid-js";
import { browser } from "wxt/browser";
import {
    initFrameAnalyzer,
    getMainVideo,
    checkEndingByFrame,
    resetFrameAnalyzer,
    destroyFrameAnalyzer,
} from "../utils/frameAnalyzer";
import {
    formatTime,
    toSeconds,
    TARGET_ID,
    BTN_CLASS,
    matchShortcut,
    isEditableTarget,
} from "@/utils/bilibili";
import { useConfig, initGlobalConfig } from "@/hooks/useStorageConfig";
import { VideoUI } from "@/components/VideoUI";

export default defineContentScript({
    matches: ["*://*.bilibili.com/video/*"],
    cssInjectionMode: "manual",

    async main(ctx) {
        // ---------- 1. 配置管理（shortcut 一起交给 useConfig 同步） ----------
        const { config } = useConfig([
            "opRanges",
            "jumpConfig",
            "frameConfig",
            "mode",
            "isAutoHandle",
            "shortcut",
        ]);
        const [isAnalyzing, setIsAnalyzing] = createSignal(false);

        await initGlobalConfig();

        // ---------- 2. 工具函数：等待元素出现 ----------
        const waitForElement = (selector: string, timeout = 10000) =>
            new Promise<Element | null>((resolve) => {
                const existing = document.querySelector(selector);
                if (existing) return resolve(existing);
                const obs = new MutationObserver(() => {
                    const el = document.querySelector(selector);
                    if (el) {
                        obs.disconnect();
                        resolve(el);
                    }
                });
                obs.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => {
                    obs.disconnect();
                    resolve(null);
                }, timeout);
            });

        // ---------- 3. UI 挂载 ----------
        let uiMounted = false;
        const ui = createIntegratedUi(ctx, {
            position: "inline",
            anchor: () => document.getElementById(TARGET_ID) as HTMLElement,
            onMount: (container) => {
                if (!document.getElementById("bili-skip-style")) {
                    const style = document.createElement("style");
                    style.id = "bili-skip-style";
                    style.textContent = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`;
                    document.head.appendChild(style);
                }
                return render(
                    () => (
                        <VideoUI
                            config={config}
                            isAnalyzing={isAnalyzing}
                        />
                    ),
                    container,
                );
            },
            onRemove: (unmount) => unmount?.(),
        });

        const updateUi = (shouldMount: boolean) => {
            if (shouldMount && !uiMounted) {
                ui.mount();
                uiMounted = true;
            } else if (!shouldMount && uiMounted) {
                ui.remove();
                uiMounted = false;
            }
        };

        // ---------- 4. 跳转逻辑 ----------
        let lastJumpTime = 0;
        const executeJump = () => {
            const now = Date.now();
            if (now - lastJumpTime < 3000) return;
            const nextBtn = document.querySelector(BTN_CLASS) as HTMLElement;
            if (nextBtn) {
                lastJumpTime = now;
                nextBtn.click();
            }
        };

        // ---------- 5. 快捷键监听（读 config.shortcut，自动同步） ----------
        ctx.addEventListener(
            window,
            "keydown",
            (event) => {
                // 输入法组合中不处理，避免拼音阶段误触
                if (event.isComposing) return;

                const sc = config.shortcut;
                if (!sc) return;

                // 焦点在搜索框 / 弹幕框 / 评论框等可编辑区域时不触发
                // 注意：评论区的富文本编辑区在 shadow DOM 里，必须把 event 一起传进去，
                // 靠 composedPath() 穿透 shadow root 才能识别（否则按快捷键会打断打字）
                if (isEditableTarget(event.target, event)) return;

                // 只匹配用户保存的那一个快捷键
                if (!matchShortcut(event, sc)) return;

                event.preventDefault();
                event.stopPropagation();
                executeJump();
            },
            { capture: true },
        );

        // ---------- 6. 核心控制逻辑 ----------
        let lastFrameCheckTime = 0;
        // ⚠️ 与 frameAnalyzer.ts 的 blackFrameRequired / staticFrameRequired 联动：
        // 200ms × 15 = 3s，200ms × 40 = 8s。改这里必须同步改阈值。
        const FRAME_CHECK_INTERVAL = 200;

        const runControlLogic = () => {
            const video = getMainVideo();
            if (!video || video.readyState < 2) return;
            const cur = video.currentTime;

            // OP 跳过
            for (const range of config.opRanges) {
                const start = toSeconds(range.start);
                const end = toSeconds(range.end);
                if (end > start && cur >= start && cur < end) {
                    video.currentTime = end;
                    return;
                }
            }
            // 切集
            if (config.mode === "manual") {
                const jumpTime = toSeconds(config.jumpConfig);
                setIsAnalyzing(false);
                if (jumpTime > 0 && cur >= jumpTime) {
                    executeJump();
                }
            } else {
                const analyzeStartTime = toSeconds(config.frameConfig);
                // 注意：analyzeStartTime > 0 表示"0 秒视为不开启"，与设置页语义需一致
                if (analyzeStartTime > 0 && cur >= analyzeStartTime) {
                    if (!isAnalyzing()) setIsAnalyzing(true);
                    const now = Date.now();
                    if (now - lastFrameCheckTime >= FRAME_CHECK_INTERVAL) {
                        lastFrameCheckTime = now;
                        try {
                            if (checkEndingByFrame(video)) {
                                executeJump();
                                setIsAnalyzing(false);
                            }
                        } catch (e) {
                            lastFrameCheckTime = 0;
                            console.warn("[Frame Analyze] 异常:", e);
                        }
                    }
                } else {
                    if (isAnalyzing()) setIsAnalyzing(false);
                }
            }
        };

        // ---------- 7. 主循环 ----------
        let lastPageState = false;
        const mainLoop = async () => {
            try {
                const isCol = !!document.querySelector(".video-pod");
                const runControl = isCol && config.isAutoHandle;

                updateUi(runControl);

                if (runControl !== lastPageState) {
                    lastPageState = runControl;
                    await browser.storage.local.set({
                        isPageReady: runControl,
                    });
                }

                if (runControl) {
                    runControlLogic();
                }
            } catch (e) {
                console.error("[Main Loop] 异常:", e);
            }
        };

        // ---------- 8. 事件监听 ----------
        const messageListener = (msg: any, sender: any, sendResponse: any) => {
            if (msg.type === "PING") {
                sendResponse({ alive: lastPageState });
                return true;
            }
            return false;
        };
        browser.runtime.onMessage.addListener(messageListener);

        // 页面 URL 变化
        const locationChangeHandler = (event: Event) => {
            const newUrl =
                (event as CustomEvent).detail?.newUrl || (event as any).newUrl;
            if (!newUrl) return;
            lastJumpTime = 0;
            resetFrameAnalyzer();
            setIsAnalyzing(false);
            lastFrameCheckTime = 0;
        };
        ctx.addEventListener(window, "wxt:locationchange", locationChangeHandler);

        // ---------- 9. 启动 ----------
        await waitForElement(TARGET_ID);
        initFrameAnalyzer();

        ctx.setInterval(mainLoop, 200);

        // ---------- 10. 清理 ----------
        // ctx.addEventListener / ctx.setInterval 由 WXT 在失效时自动清理，
        // 手动再 removeEventListener / clearInterval 会因为引用被包装而失效，徒增困惑。
        // 只有非 ctx 注册的 browser.runtime.onMessage 需要手动移除。
        ctx.onInvalidated(() => {
            browser.runtime.onMessage.removeListener(messageListener);
            updateUi(false);
            destroyFrameAnalyzer();
        });
    },
});
import type { TimePoint } from "@/types/types";
import { browser } from "wxt/browser";

export const MAX_HISTORY_LENGTH = 20;

export const LATEST_HISTORY_LENGTH = 2;

export const PINNED_HISTORY_LENGTH = 3;

export const BTN_CLASS = ".bpx-player-ctrl-next";

export const TARGET_ID = "viewbox_report";

/**
 * 获取当前页面的活动标签页信息
 */
export const getActiveTab = async () => {
    try {
        const tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });

        return tabs[0] || null;
    } catch {
        return null;
    }
};

/**
 * 清理哔哩哔哩 URL，提取关键信息
 */
export const cleanBiliUrl = (url: string): string => {
    try {
        const u = new URL(url);
        const p = u.searchParams.get("p");
        const baseUrl = `${u.origin}${u.pathname.replace(/\/$/, "")}`;
        return `${baseUrl}${p ? `?p=${p}` : ""}`;
    } catch (e) {
        return url;
    }
};

/**
 * 检测当前页面是否为合集页，并返回合集标题
 */
export const getCollectionTitle = async (tabId: number): Promise<string> => {
    try {
        const results = await browser.scripting.executeScript({
            target: { tabId },
            func: () => {
                const isPod = !!document.querySelector(".video-pod");
                if (!isPod) return "";

                const isColl = !!document.querySelector(".subscribe-btn");

                const titleEl = document.querySelector(
                    ".video-title",
                ) as HTMLElement | null;

                const titleEl2 = document.querySelector(
                    ".simple-base-item.video-pod__item.active.normal .title",
                ) as HTMLElement | null;

                if (isColl) {
                    return titleEl?.title;
                } else {
                    return (
                        titleEl?.title +
                        (titleEl2 ? ` - ${titleEl2?.title}` : "")
                    );
                }
            },
        });
        return results[0]?.result || "";
    } catch {
        return "";
    }
};

/**
 * 获取插件名称和版本号
 */
export const getSoftName = () => browser.runtime.getManifest().name;

/**
 * 获取插件版本号
 */
export const getSoftVersion = () => browser.runtime.getManifest().version;

/**
 * 创建一个 storage.onChanged 监听器，只处理指定的配置键
 * @param configKeys 需要监听的配置键列表（如 DEFAULT_CONFIG 的键）
 * @param onUpdate 当配置变更时的回调函数，传入变更后的配置对象
 * @returns 一个符合 storage.onChanged 签名的事件处理函数
 */
export function createStorageListener<T extends Record<string, any>>(
    configKeys: (keyof T)[],
    onUpdate: (partial: Partial<T>) => void,
) {
    return (changes: Record<string, any>, area: string) => {
        if (area !== "local") return;
        const data: Partial<T> = {};
        for (const key of configKeys) {
            const change = changes[key as string];
            if (change) {
                data[key] = change.newValue;
            }
        }
        if (Object.keys(data).length) {
            onUpdate(data);
        }
    };
}

/**
 * @param t 时间点
 * @returns 转换为秒数
 */
export const toSeconds = (t: TimePoint) =>
    (t.h || 0) * 3600 + (t.m || 0) * 60 + (t.s || 0);

export const pad = (n: number) => n.toString().padStart(2, "0");
export const formatTime = (t: TimePoint) => `${t.h}:${pad(t.m)}:${pad(t.s)}`;

// ============================================================
// 快捷键匹配辅助函数
// ------------------------------------------------------------
// 这里保存的快捷键格式与 options 页面 Shortcut.tsx 中写入
// storage.local 的 shortcut 字段完全一致：
//   - 单键：        "N"、"X"、"Z"
//   - 特殊键：      "Space"、"Enter"、"F1"、"Tab"
//   - 方向键：      "↑"、"↓"、"←"、"→"
//   - 组合键：      "Ctrl+Shift+S"、"Alt+N"
// 若修改此处逻辑，务必同步调整 Shortcut.tsx 中的 normalizeKeyName。
// ============================================================

/**
 * 将 KeyboardEvent 的 key 规范化为与保存时一致的字符串。
 *
 * 浏览器原生 e.key 的取值不统一：
 *   - 空格是 " "，方向键是 "ArrowUp" 等；
 *   - 字母会受 Shift / CapsLock 影响大小写；
 * 这里统一映射成 Shortcut.tsx 保存时的格式，便于字符串比较。
 *
 * 示例：
 *   " "        -> "Space"
 *   "ArrowUp"  -> "↑"
 *   "n"        -> "N"
 *   "Enter"    -> "Enter"   （保留原样）
 */
export function normalizeKeyboardEventKey(e: KeyboardEvent): string {
    const { key } = e;
    if (key === " ") return "Space";
    if (key === "ArrowUp") return "↑";
    if (key === "ArrowDown") return "↓";
    if (key === "ArrowLeft") return "←";
    if (key === "ArrowRight") return "→";
    if (key.length === 1) return key.toUpperCase();
    return key;
}

/**
 * 解析快捷键字符串为「主键 + 修饰键集合」。
 *
 * 约定：最后一个 "+" 之后的部分是主键，前面的都是修饰键。
 * 因为键盘上不存在名为 "+" 的主键（用户录入时会把 "+" 映射为其他名字），
 * 所以这个约定是安全的。
 *
 * 示例：
 *   "N"           -> { keyName: "N",          mods: Set() }
 *   "Ctrl+Alt+K"  -> { keyName: "K",          mods: Set(["Ctrl","Alt"]) }
 *   "Space"       -> { keyName: "Space",      mods: Set() }
 *
 * 传入空字符串时返回 null，调用方据此直接跳过匹配。
 */
export function parseShortcut(
    shortcut: string,
): { keyName: string; mods: Set<string> } | null {
    if (!shortcut) return null;
    const parts = shortcut.split("+");
    const keyName = parts.pop();
    if (!keyName) return null;
    return { keyName, mods: new Set(parts) };
}

/**
 * 判断某个键盘事件是否精确匹配用户保存的快捷键。
 *
 * 修饰键必须严格一致（XOR 语义）：
 *   - 设置为单键 "N" 时，Ctrl+N、Shift+N、Alt+N 均不触发；
 *   - 设置为 "Ctrl+Shift+S" 时，只按 S、或 Ctrl+S 都不触发。
 *
 * 这样行为可预测，不会因为多按了一个修饰键而误触发跳转。
 */
export function matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
    const parsed = parseShortcut(shortcut);
    if (!parsed) return false;
    const { keyName, mods } = parsed;

    if (e.ctrlKey !== mods.has("Ctrl")) return false;
    if (e.altKey !== mods.has("Alt")) return false;
    if (e.shiftKey !== mods.has("Shift")) return false;
    if (e.metaKey !== mods.has("Meta")) return false;

    return normalizeKeyboardEventKey(e) === keyName;
}

/**
 * 单个元素本身是否「可编辑」。
 *
 * 注意：`isContentEditable` 会向上继承，所以命中 contenteditable 容器的
 * 子节点（例如富文本里加了样式的 <span>）也会返回 true。
 */
function isEditableElement(el: Element | null | undefined): boolean {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el instanceof HTMLElement && el.isContentEditable) return true;
    // 少数富文本编辑器把可编辑区做成 role="textbox" 的普通 div
    if (el.getAttribute("role") === "textbox") return true;
    return false;
}

/**
 * 取真正持有焦点的元素，会逐层穿透 shadow DOM。
 *
 * 例如 B 站评论框 <bili-comment-rich-textarea> 的可编辑区在 shadow root 里，
 * `document.activeElement` 只能拿到宿主元素，穿透后才能拿到内部的
 * `div[contenteditable="true"]`。
 */
export function getDeepActiveElement(): Element | null {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) {
        el = el.shadowRoot.activeElement;
    }
    return el;
}

/**
 * 判断键盘事件是否发生在可编辑区域。
 *
 * 用于避免用户在以下场景按快捷键时误触跳转：
 *   - B 站搜索框 / 弹幕输入框（<input>）
 *   - 评论框（<textarea>）
 *   - 下拉选择（<select>）
 *   - 富文本编辑器（contenteditable="true"）
 *
 * 富文本（例如评论区 <bili-comment-rich-textarea>）的编辑区在 shadow DOM 中，
 * 监听器挂在 window 上时 `event.target` 会被「重定向」成宿主自定义元素，
 * 既不是 INPUT 也不是 contenteditable，因此必须用 `composedPath()` 穿透
 * shadow root，或检查穿透后的 activeElement，否则快捷键会在打字时被触发。
 */
export function isEditableTarget(
    target: EventTarget | null,
    event?: Event,
): boolean {
    // 1. composedPath() 会给出事件经过的完整路径（composed 事件可穿透 shadow root），
    //    最内层的元素就是用户真正操作的节点。
    const path = event?.composedPath?.();
    if (path && path.length > 0) {
        for (const node of path) {
            if (!(node instanceof Element)) continue;
            // 只看第一个元素节点，避免命中外层普通容器造成误判
            if (isEditableElement(node)) return true;
            break;
        }
    }

    // 2. 未传 event 时的旧行为：直接看 target 本身
    if (target instanceof Element && isEditableElement(target)) return true;

    // 3. 兜底：看当前焦点（含 shadow DOM 内部），覆盖事件被重定向到宿主的情况
    return isEditableElement(getDeepActiveElement());
}

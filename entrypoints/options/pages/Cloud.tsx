import {
    For,
    Show,
    createEffect,
    createSignal,
    untrack,
} from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { Cloud, Info, RefreshCw, Vote } from "lucide-solid";
import { browser } from "wxt/browser";
import { useConfig } from "@/hooks/useStorageConfig";
import { extractBvid } from "@/utils/bilibili";
import { formatClockTime } from "@/utils/format";
import { buildCloudPath, rememberCloudContext } from "@/utils/cloudContext";
import type { ApiSegment, BiliVideoPageInfo } from "@/types/types";

export default function CloudPage() {
    const { config, update } = useConfig(["useCloudSegments"]);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const param = (key: string) => {
        const value = (searchParams as Record<string, unknown>)[key];
        return typeof value === "string" ? value : "";
    };

    const initialBvid = param("bvid");
    const [bvid, setBvid] = createSignal(initialBvid);
    const [bvidDraft, setBvidDraft] = createSignal(initialBvid);
    const [bvidError, setBvidError] = createSignal("");
    const [currentPage, setCurrentPage] = createSignal(
        Number(param("page")) || 0,
    );
    const [segments, setSegments] = createSignal<ApiSegment[]>([]);
    const [pages, setPages] = createSignal<BiliVideoPageInfo[]>([]);
    const [loading, setLoading] = createSignal(Boolean(initialBvid));
    const [error, setError] = createSignal("");
    /** 请求序号：快速切换 BV 时丢弃迟到的旧响应 */
    let querySeq = 0;

    const enabled = () => config.useCloudSegments;

    const openSegment = (segment: ApiSegment) => {
        const params = new URLSearchParams({
            uuid: segment.id,
            bvid: bvid(),
            cid: segment.cid,
            page: String(currentPage() || 1),
        });
        navigate(`/segment?${params.toString()}`);
    };

    const toggle = () => {
        void update({ useCloudSegments: !enabled() });
    };

    /**
     * 手动输入 BV 号（也接受直接粘贴视频链接）：
     * 换视频时改写 URL，让侧边栏 / 刷新都能保留；
     * 输入的是同一个 BV 时直接强制刷新。
     */
    const submitBvid = () => {
        const next = extractBvid(bvidDraft());

        if (!next) {
            setBvidError(
                "请输入 BV 号（BV + 10 位字母和数字），也可以直接粘贴视频链接",
            );
            return;
        }

        setBvidError("");

        if (next === bvid()) {
            void query(true);
            return;
        }

        navigate(buildCloudPath(next, 1));
    };

    const loadPages = async () => {
        const id = bvid();
        if (!id) return;

        try {
            const result = (await browser.runtime.sendMessage({
                type: "BILI_PAGES",
                data: { bvid: id },
            })) as { pages?: BiliVideoPageInfo[] } | undefined;

            if (bvid() !== id) return;
            setPages(result?.pages ?? []);
        } catch {
            if (bvid() !== id) return;
            setPages([]);
        }
    };

    const query = async (force = false) => {
        const id = bvid();
        if (!id) return;

        const seq = ++querySeq;
        setLoading(true);
        setError("");
        void loadPages();

        try {
            const result = (await browser.runtime.sendMessage({
                type: "SB_LOOKUP",
                data: { bvid: id, force },
            })) as
                | {
                      ok?: boolean;
                      segments?: ApiSegment[];
                      reason?: string;
                  }
                | undefined;

            if (seq !== querySeq) return;

            if (!result?.ok) {
                setError(`查询失败：${result?.reason ?? "未知错误"}`);
                setSegments([]);
                return;
            }

            setSegments(result.segments ?? []);
        } catch {
            if (seq !== querySeq) return;
            setError("查询失败：网络异常");
            setSegments([]);
        } finally {
            if (seq === querySeq) setLoading(false);
        }
    };

    let lastBvid = "";

    createEffect(() => {
        const next = param("bvid");
        const nextPage = Number(param("page")) || 0;

        if (next !== lastBvid) {
            lastBvid = next;
            setSegments([]);
            setPages([]);
        }

        setBvid(next);
        setCurrentPage(nextPage);
        setBvidDraft(next);
        setBvidError("");

        if (next) {
            rememberCloudContext(next, nextPage);
            untrack(() => void query(true));
        } else {
            setSegments([]);
            setPages([]);
            setError("");
            setLoading(false);
        }
    });

    const groups = () => {
        const map = new Map<string, ApiSegment[]>();

        for (const segment of segments()) {
            const key = segment.cid || "未知";
            const list = map.get(key) ?? [];
            list.push(segment);
            map.set(key, list);
        }

        return [...map.entries()]
            .map(([cid, list]) => {
                const info = pages().find((item) => item.cid === cid);
                return {
                    cid,
                    page: info?.page ?? null,
                    title: info?.title ?? "",
                    segments: [...list].sort((a, b) => a.start - b.start),
                };
            })
            .sort(
                (a, b) =>
                    (a.page ?? Number.MAX_SAFE_INTEGER) -
                        (b.page ?? Number.MAX_SAFE_INTEGER) ||
                    a.cid.localeCompare(b.cid),
            );
    };

    return (
        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-10">
                <div>
                    <h1 class="text-3xl mb-3 text-primary flex items-center gap-3">
                        <Cloud size={26} />
                        云端片段
                    </h1>
                    <p class="text-base-content/70 text-base leading-relaxed">
                        云端片段开关，以及当前视频的云端数据（按 cid 分组）。
                    </p>
                </div>
            </header>

            <div class="card bg-base-100 shadow-sm border border-base-300 mb-8">
                <div class="card-body gap-4 p-6">
                    <h2 class="card-title text-base font-bold text-base-content">
                        使用云端片段：{enabled() ? "已开启" : "已关闭"}
                    </h2>
                    <p class="text-sm text-base-content/60 m-0 leading-relaxed">
                        开启后，intro / sponsor 作为片段跳过，outro 作为下一
                        P；与手动片段重叠时手动优先；云端有多条下一 P 时只取起点最大的一条。
                    </p>
                    <div class="flex items-center">
                        <div
                            class={`aura ${
                                enabled()
                                    ? "aura-rainbow duration-1000"
                                    : "text-orange-600"
                            }`}
                        >
                            <button
                                class={`btn btn-soft ${
                                    enabled() ? "btn-success" : "btn-error"
                                }`}
                                onClick={toggle}
                            >
                                {enabled() ? "已开启" : "已关闭"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card bg-base-100 shadow-sm border border-base-300 mb-8">
                <div class="card-body gap-3 p-6">
                    <h2 class="card-title text-base font-bold text-base-content">
                        查看指定视频
                    </h2>
                    <p class="text-sm text-base-content/60 m-0 leading-relaxed">
                        输入 BV 号，或直接粘贴视频链接；从播放页状态条点「查看云端数据→」进入时，这里会自动带上当前
                        BV。
                    </p>
                    <div class="flex flex-wrap items-stretch gap-2">
                        <input
                            class="input input-sm flex-1 min-w-0 font-mono"
                            type="text"
                            spellcheck={false}
                            autocomplete="off"
                            value={bvidDraft()}
                            placeholder="BV1xx411c7mD 或 https://www.bilibili.com/video/BV..."
                            onInput={(event) => {
                                setBvidDraft(event.currentTarget.value);
                                setBvidError("");
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") submitBvid();
                            }}
                        />
                        <button class="btn btn-primary btn-sm" onClick={submitBvid}>
                            查询
                        </button>
                    </div>
                    <Show when={bvidError()}>
                        <p class="text-xs text-error m-0">{bvidError()}</p>
                    </Show>
                </div>
            </div>

            <Show
                when={bvid()}
                fallback={
                    <div class="card bg-base-100 shadow-sm border border-base-300">
                        <div class="card-body gap-3 p-6 flex-row items-start">
                            <Info
                                size={18}
                                class="text-primary shrink-0 mt-0.5"
                            />
                            <div>
                                <h2 class="card-title text-base font-bold text-base-content">
                                    还没有选择视频
                                </h2>
                                <p class="text-sm text-base-content/60 m-0 mt-2 leading-relaxed">
                                    在上方输入 BV 号或粘贴视频链接即可查询；
                                    也可以到播放页状态条点「查看云端数据→」进入，
                                    会自动带上当前 BV 和分 P。
                                </p>
                            </div>
                        </div>
                    </div>
                }
            >
                <div class="card bg-base-100 shadow-sm border border-base-300 mb-6">
                    <div class="card-body gap-3 p-6">
                        <div class="flex justify-between items-center gap-3">
                            <div>
                                <h2 class="card-title text-base font-bold text-base-content">
                                    当前视频：{bvid()}
                                </h2>
                                <p class="text-xs text-base-content/50 m-0 mt-1">
                                    数据来源 /api/skipSegments（公开片段），按
                                    cid 分组
                                </p>
                            </div>
                            <button
                                class="btn btn-outline btn-primary btn-sm"
                                disabled={loading()}
                                onClick={() => void query(true)}
                            >
                                <RefreshCw size={12} />
                                {loading() ? "查询中…" : "刷新"}
                            </button>
                        </div>

                        <Show when={error()}>
                            <p class="text-sm text-error m-0">{error()}</p>
                        </Show>

                        <p class="text-xs text-base-content/50 m-0">
                            服务器可能有延迟，刚上传的片段建议等待 1–2
                            分钟后再刷新。
                        </p>
                    </div>
                </div>

                <Show when={!loading() && segments().length === 0 && !error()}>
                    <div class="text-center py-12 bg-base-100 rounded-2xl border-2 border-dashed border-base-300">
                        <p class="text-base-content/50 m-0">
                            该视频暂无云端片段
                        </p>
                    </div>
                </Show>

                <div class="flex flex-col gap-6">
                    <For each={groups()}>
                        {(group) => (
                            <div class="card bg-base-100 shadow-sm border border-base-300">
                                <div class="card-body gap-3 p-5">
                                    <div class="flex justify-between items-center gap-3">
                                        <div class="flex flex-col gap-0.5 min-w-0">
                                            <div class="flex items-center gap-2">
                                                <h3 class="font-bold text-sm text-base-content">
                                                    {group.page != null
                                                        ? `P${group.page} · `
                                                        : ""}
                                                    cid: {group.cid}
                                                </h3>
                                                <Show
                                                    when={
                                                        group.page != null &&
                                                        group.page ===
                                                            currentPage()
                                                    }
                                                >
                                                    <span class="badge badge-xs badge-primary">
                                                        当前
                                                    </span>
                                                </Show>
                                            </div>
                                            <Show when={group.title}>
                                                <span class="text-xs text-base-content/50 truncate">
                                                    {group.title}
                                                </span>
                                            </Show>
                                        </div>
                                        <span class="text-xs text-base-content/50 shrink-0">
                                            {group.segments.length} 段
                                        </span>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <For each={group.segments}>
                                            {(segment) => (
                                                <div class="bg-base-200/60 rounded-xl p-3">
                                                    <div class="flex flex-wrap items-center gap-2">
                                                        <span
                                                            class={`badge badge-sm ${
                                                                segment.category ===
                                                                "outro"
                                                                    ? "badge-secondary"
                                                                    : "badge-primary"
                                                            }`}
                                                            title={
                                                                segment.category ===
                                                                "outro"
                                                                    ? "下一 P 片段"
                                                                    : "跳过片段"
                                                            }
                                                        >
                                                            {segment.category ===
                                                            "outro"
                                                                ? "P"
                                                                : "⏭"}
                                                        </span>
                                                        <span class="text-xs text-base-content/70">
                                                            {segment.category}/
                                                            {segment.actionType}
                                                        </span>
                                                        <span class="font-mono text-xs text-base-content/80">
                                                            {formatClockTime(
                                                                segment.start,
                                                            )}{" "}
                                                            →{" "}
                                                            {formatClockTime(
                                                                segment.end,
                                                            )}
                                                        </span>
                                                        <span class="text-xs text-base-content/50">
                                                            votes=
                                                            {segment.votes} ·
                                                            duration=
                                                            {
                                                                segment.videoDuration
                                                            }
                                                        </span>
                                                        <Show
                                                            when={
                                                                segment.category ===
                                                                "outro"
                                                            }
                                                        >
                                                            <button
                                                                class="btn btn-ghost btn-xs ml-auto text-primary"
                                                                title="查看社区投票 / 隐藏 / 锁定状态"
                                                                onClick={() =>
                                                                    openSegment(
                                                                        segment,
                                                                    )
                                                                }
                                                            >
                                                                <Vote
                                                                    size={12}
                                                                />
                                                                社区
                                                            </button>
                                                        </Show>
                                                    </div>
                                                    <div class="text-[10px] text-base-content/40 font-mono break-all mt-1">
                                                        UUID: {segment.id}
                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}

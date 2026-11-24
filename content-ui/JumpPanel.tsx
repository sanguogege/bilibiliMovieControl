import {
    For,
    Show,
    createEffect,
    createSignal,
    on,
    onCleanup,
    onMount,
} from "solid-js";
import { browser } from "wxt/browser";
import { getBvidFromUrl } from "@/utils/bilibili";
import {
    effectiveEnd,
    MIN_SEGMENT_SECONDS,
    parseCreatedSegments,
} from "@/utils/segments";
import { reasonText } from "@/utils/errors";
import {
    getOrCreateUserID,
    MIN_USER_ID_LENGTH,
    saveUserID,
} from "@/utils/userId";
import { buildSubmitPlan } from "@/utils/jumpPanel";
import { classifySubmitResult } from "@/utils/upload";
import { formatSeconds, parseTimeText } from "@/content-ui/time";
import { ensurePanelStyles } from "@/content-ui/panelStyles";
import {
    closePanelState,
    panelOpen,
    panelTab,
    uiState,
} from "@/content-ui/state";
import type {
    JumpPanelHandlers,
    JumpPanelTab,
    SegmentKind,
    SkipSegment,
} from "@/types/types";

export interface JumpPanelProps extends JumpPanelHandlers {
    /** #playerWrap：拖拽边界 */
    container: HTMLElement;
}

const KIND_LABELS: Record<SegmentKind, string> = {
    skip: "片段跳过",
    next: "下一P",
};

const SectionHeader = (props: {
    title: string;
    extra?: string;
    /** 传入后在标题后显示「?」，鼠标悬停时显示该说明 */
    hint?: string;
}) => (
    <div class="bmc-section-head">
        <span class="bmc-heading">
            {props.title}
            <Show when={props.hint}>
                <span
                    class="bmc-help is-hint"
                    title={props.hint}
                    aria-label={props.hint}
                >
                    ?
                </span>
            </Show>
        </span>
        <Show when={props.extra}>
            <span>{props.extra}</span>
        </Show>
    </div>
);

const EmptyHint = (props: { text: string }) => (
    <div class="bmc-empty">{props.text}</div>
);

/** 片段列表行（查看页只读；设置页可选中、可删除） */
const SegmentRow = (props: {
    segment: SkipSegment;
    selected?: boolean;
    /** 设置页的紧凑徽标：下一P / 跳过 */
    compact?: boolean;
    onClick?: () => void;
    /** 传入时在行尾显示删除按钮 */
    onDelete?: () => void;
}) => {
    const endText = () =>
        props.segment.kind === "next" &&
        props.segment.end <= props.segment.start
            ? "结尾"
            : formatSeconds(props.segment.end);

    return (
        <div
            class="bmc-seg"
            classList={{ "is-selected": Boolean(props.selected) }}
            onClick={props.onClick}
        >
            <Show
                when={props.segment.source !== "api"}
                fallback={<span class="bmc-badge is-api">BiliSB</span>}
            >
                <span
                    class={
                        props.segment.kind === "next"
                            ? "bmc-badge is-next"
                            : "bmc-badge is-skip"
                    }
                >
                    {props.compact
                        ? props.segment.kind === "next"
                            ? "下一P"
                            : "跳过"
                        : props.segment.kind === "next"
                          ? "手动·下一P"
                          : "手动·跳过"}
                </span>
            </Show>

            <Show when={props.segment.source === "api"}>
                <span
                    class="bmc-kind"
                    title={
                        props.segment.kind === "next"
                            ? "下一 P 片段"
                            : "跳过片段"
                    }
                >
                    {props.segment.kind === "next" ? "🔚" : "⏭"}
                </span>
            </Show>

            <span class="bmc-time">
                {formatSeconds(props.segment.start)} → {endText()}
            </span>

            <Show when={props.onDelete}>
                <button
                    type="button"
                    class="bmc-row-del"
                    title="删除该片段"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        props.onDelete?.();
                    }}
                >
                    删除
                </button>
            </Show>
        </div>
    );
};

/**
 * 播放页浮动窗口：查看 / 设置两页。
 * 行为与原先的命令式实现保持一致，样式仍使用手写 CSS。
 */
export function JumpPanel(props: JumpPanelProps) {
    ensurePanelStyles();

    let panelEl: HTMLDivElement | undefined;
    let headEl: HTMLDivElement | undefined;

    const [left, setLeft] = createSignal(16);
    const [top, setTop] = createSignal(16);

    const [activeTab, setActiveTab] = createSignal<JumpPanelTab>(panelTab());
    const [selectedId, setSelectedId] = createSignal<string | null>(null);
    /** 编辑器是否处于可编辑状态（点「编辑」后才为 true，点「保存」后回到 false） */
    const [editing, setEditing] = createSignal(false);
    /** 当前编辑器里是否有目标：已选片段 / 新建的草稿 */
    const [hasDraft, setHasDraft] = createSignal(false);
    const [editId, setEditId] = createSignal<string | null>(null);
    const [editKind, setEditKind] = createSignal<SegmentKind>("skip");
    const [editStartText, setEditStartText] = createSignal(
        formatSeconds(props.getCurrentTime()),
    );
    const [editEndText, setEditEndText] = createSignal(
        formatSeconds(
            Math.min(
                props.getCurrentTime() + 20,
                props.getDuration() || props.getCurrentTime() + 20,
            ),
        ),
    );

    const [userID, setUserID] = createSignal("");
    const [statusKind, setStatusKind] = createSignal<
        "info" | "success" | "error"
    >("info");
    const [statusText, setStatusText] = createSignal("");
    const [submitting, setSubmitting] = createSignal(false);
    const [apiLoaded, setApiLoaded] = createSignal(false);
    const [refreshing, setRefreshing] = createSignal(false);

    let statusTimer: ReturnType<typeof setTimeout> | undefined;

    const showStatus = (text: string, kind: "info" | "success" | "error") => {
        setStatusKind(kind);
        setStatusText(text);

        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = setTimeout(
            () => {
                setStatusText("");
                statusTimer = undefined;
            },
            kind === "error" ? 5000 : 3000,
        );
    };

    onCleanup(() => {
        if (statusTimer) clearTimeout(statusTimer);
    });

    const statusColor = () =>
        statusKind() === "error"
            ? "#f87171"
            : statusKind() === "success"
              ? "#4ade80"
              : "rgba(255,255,255,.55)";

    const videoDuration = () => {
        const value = props.getDuration();
        return Number.isFinite(value) ? value : 0;
    };

    const isEditing = () => editing();
    const hasTarget = () =>
        editId() !== null || selectedId() !== null || hasDraft();

    /**
     * 云端片段直接读 content 推过来的 store（与状态栏同源），
     * 这里只负责展示顺序：下一 P 排最后，其余按起点。
     */
    const cloudSegments = () =>
        [...uiState.cloudSegments].sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === "next" ? 1 : -1;
            return a.start - b.start;
        });

    const findSegment = (id: string | null) =>
        id
            ? (uiState.config.segments.find((item) => item.id === id) ??
              uiState.cloudSegments.find((item) => item.id === id) ??
              null)
            : null;

    /** 编辑框里的结束位置：next 且 end<=start 时用视频结尾 */
    const endTextFor = (segment: SkipSegment): string => {
        const end =
            segment.kind === "next" && segment.end <= segment.start
                ? videoDuration() || segment.start + 60
                : segment.end;
        return formatSeconds(end);
    };

    /**
     * 打开「设置」页时确定一个当前目标：
     * 1. 正在编辑 → 保留草稿
     * 2. 已有选中 → 保留
     * 3. 当前进度落在某个片段里 → 选中它
     * 4. 否则选第一个片段
     * 5. 一个片段都没有 → 直接进入新建草稿（起始 = 当前进度）
     */
    const prepareSubmitTab = () => {
        if (isEditing()) return;

        const selected = findSegment(selectedId());
        const now = props.getCurrentTime();

        const containing = uiState.config.segments.find(
            (segment) => now >= segment.start && now < segment.end,
        );

        const target = selected ?? containing ?? uiState.config.segments[0];

        if (!target) {
            setSelectedId(null);
            setEditId(null);
            setHasDraft(true);
            setEditKind("skip");
            setEditing(false);
            setEditStartText(formatSeconds(now));

            const end =
                videoDuration() > 0
                    ? Math.min(now + 20, videoDuration())
                    : now + 20;
            setEditEndText(formatSeconds(Math.max(now + 1, end)));
            return;
        }

        setSelectedId(target.id);
        setEditId(target.id);
        setHasDraft(false);
        setEditKind(target.kind);
        setEditStartText(formatSeconds(target.start));
        setEditEndText(endTextFor(target));
        setEditing(false);
    };

    const startNewSegment = () => {
        setSelectedId(null);
        setEditId(null);
        setHasDraft(true);
        setEditKind("skip");
        // 新建即进入编辑状态：起止时间默认当前进度、可直接修改
        setEditing(true);

        const start = props.getCurrentTime();
        setEditStartText(formatSeconds(start));

        const end =
            videoDuration() > 0
                ? Math.min(start + 20, videoDuration())
                : start + 20;
        setEditEndText(formatSeconds(Math.max(start + 1, end)));
    };

    const buildEditSegment = (): SkipSegment | null => {
        const start = parseTimeText(editStartText());
        let end = parseTimeText(editEndText());

        if (!Number.isFinite(start) || !Number.isFinite(end)) {
            showStatus("时间格式应为 时:分:秒", "error");
            return null;
        }

        if (start < 0) {
            showStatus("起始位置不能为负数", "error");
            return null;
        }

        // 结束不晚于开始时，默认取「开始 + 20 秒」
        if (end <= start) {
            end = start + 20;
            const duration = videoDuration();
            if (duration > 0 && end > duration) end = duration;

            if (end - start < MIN_SEGMENT_SECONDS) {
                showStatus("结束位置必须晚于起始位置", "error");
                return null;
            }

            setEditEndText(formatSeconds(end));
        }

        return {
            id: editId() ?? crypto.randomUUID(),
            start,
            end,
            kind: editKind(),
            source: "manual",
        };
    };

    /** 「编辑 / 保存」：未编辑时进入编辑，编辑中则保存当前草稿 */
    const toggleEdit = () => {
        if (isEditing()) {
            void saveCurrent();
            return;
        }

        if (!hasTarget()) {
            showStatus("请先选中或新建片段", "error");
            return;
        }

        setEditing(true);
    };

    const saveCurrent = async () => {
        const segment = buildEditSegment();
        if (!segment) return;

        await props.onSaveSegment(segment);
        setSelectedId(segment.id);
        setEditId(segment.id);
        setHasDraft(false);
        setEditStartText(formatSeconds(segment.start));
        setEditEndText(formatSeconds(segment.end));
        setEditing(false);
        showStatus("已保存片段", "success");
    };

    const importStartTime = () => {
        if (!isEditing()) return;
        setEditStartText(formatSeconds(props.getCurrentTime()));
    };

    const importEndTime = () => {
        if (!isEditing()) return;
        setEditEndText(formatSeconds(props.getCurrentTime()));
    };

    const selectSegment = (segment: SkipSegment) => {
        setSelectedId(segment.id);
        setEditing(false);
        setEditId(segment.id);
        setHasDraft(false);
        setEditKind(segment.kind);
        setEditStartText(formatSeconds(segment.start));
        setEditEndText(endTextFor(segment));
    };

    const onKindChange = (value: SegmentKind) => {
        setEditKind(value);

        // 只有新建的草稿在切换类型时自动填入起止
        const isDraft = editId() === null && hasDraft();
        if (!isDraft) return;

        const start = props.getCurrentTime();
        setEditStartText(formatSeconds(start));

        const duration = videoDuration();
        const end =
            value === "next" && duration > 0
                ? duration
                : Math.min(start + 20, duration > 0 ? duration : start + 20);

        setEditEndText(formatSeconds(Math.max(start + 1, end)));
    };

    const deleteSegmentById = (id: string) => {
        const target = findSegment(id);

        if (target?.source === "api") {
            showStatus("云端片段不能删除", "error");
            return;
        }

        void props.onDeleteSegment(id).then(() => {
            if (selectedId() === id) setSelectedId(null);
            if (editId() === id) {
                setEditId(null);
                setHasDraft(false);
            }
            setEditing(false);

            // 列表删空也保持面板打开：prepareSubmitTab 会给出空列表下的新建草稿
            prepareSubmitTab();
            showStatus("已删除片段", "success");
        });
    };

    const preview = () => {
        const segment = isEditing()
            ? buildEditSegment()
            : findSegment(selectedId());
        if (!segment) {
            showStatus("请先选中或新建片段", "error");
            return;
        }

        props.onPreview(segment);
        closePanelState();
    };

    const seekToStart = () => {
        const start = isEditing()
            ? parseTimeText(editStartText())
            : (findSegment(selectedId())?.start ?? Number.NaN);

        if (!Number.isFinite(start)) {
            showStatus("请先设置起始位置", "error");
            return;
        }

        props.onSeek(start);
    };

    const seekToEnd = () => {
        const segment = isEditing() ? null : findSegment(selectedId());
        const end = isEditing()
            ? parseTimeText(editEndText())
            : segment
              ? effectiveEnd(segment, videoDuration())
              : Number.NaN;

        if (!Number.isFinite(end)) {
            showStatus("请先设置结束位置", "error");
            return;
        }

        props.onSeek(end);
    };

    /**
     * 触发一次云端拉取（拉到后由 content 写入 store，状态栏和面板同时更新）。
     * apiLoaded 只用于决定打开「查看」时要不要自动拉一次。
     */
    const loadApiSegments = async (force = false): Promise<void> => {
        if (!uiState.config.useCloudSegments) {
            setApiLoaded(false);
            return;
        }

        try {
            await props.onRefreshCloud?.(force);
            setApiLoaded(true);
        } catch {
            // 失败时保持 apiLoaded = false，下次切回「查看」会重试
        }
    };

    const refreshCloud = async () => {
        if (refreshing()) return;

        setRefreshing(true);
        try {
            await loadApiSegments(true);
        } finally {
            setRefreshing(false);
        }
    };

    /**
     * 上传完成（新建或「已存在」）后清理本地片段：
     * 这些片段已经在服务端，继续留在手动列表里会和云端片段重复。
     * 删除失败时保留剩余片段，让用户能自己处理，不把上传结果误报成失败。
     */
    const clearUploadedSegments = async (ids: string[]): Promise<boolean> => {
        const pending = ids.filter((id) =>
            uiState.config.segments.some((item) => item.id === id),
        );
        if (pending.length === 0) return true;

        try {
            for (const id of pending) {
                await props.onDeleteSegment(id);
            }
        } catch {
            return false;
        }

        if (selectedId() && !findSegment(selectedId())) setSelectedId(null);
        if (editId() && !findSegment(editId())) {
            setEditId(null);
            setHasDraft(false);
        }
        setEditing(false);
        prepareSubmitTab();

        return true;
    };

    const handleSubmit = async () => {
        if (submitting()) return;

        if (userID().length < MIN_USER_ID_LENGTH) {
            showStatus(
                `私人 ID 至少需要 ${MIN_USER_ID_LENGTH} 个字符`,
                "error",
            );
            return;
        }

        const durationNow = videoDuration();
        if (durationNow <= 0) {
            showStatus("视频时长未就绪，请等视频加载后再试", "error");
            return;
        }

        const bvid = getBvidFromUrl(location.href);
        if (!bvid) {
            showStatus("未识别到当前视频的 BV 号", "error");
            return;
        }

        const plan = buildSubmitPlan(uiState.config, durationNow);
        if (plan.segments.length === 0) {
            showStatus("当前没有可上传的片段", "error");
            return;
        }

        setSubmitting(true);
        showStatus("正在上传…", "info");

        try {
            await saveUserID(userID());

            const result = await props.onSubmit({
                bvid,
                videoDuration: durationNow,
                userID: userID(),
                segments: plan.segments,
            });
            const outcome = classifySubmitResult(result);

            if (outcome === "failed") {
                const base = reasonText(result?.reason, "上传失败");
                showStatus(
                    result?.message ? `${base}：${result.message}` : base,
                    "error",
                );
                return;
            }

            if (outcome === "unknown") {
                // 请求可能已经到了服务端：保留本地片段，重试时命中 409 再按成功处理
                showStatus("结果未知，可再上传一次", "error");
                return;
            }

            props.onUploaded?.(result?.created);

            // 200 只返回新增片段：少于提交数说明其余片段服务端已存在（部分重复时服务端不会报 409）
            const created = parseCreatedSegments(result?.created).length;
            const duplicated =
                created > 0 ? Math.max(0, plan.segments.length - created) : 0;
            const cleaned = await clearUploadedSegments(plan.segmentIds);

            if (!cleaned) {
                showStatus("已上传，但本地片段删除失败", "error");
            } else if (outcome === "duplicate") {
                showStatus("服务器已有该片段，按成功处理", "success");
            } else if (duplicated > 0) {
                showStatus(
                    `上传成功：${created} 段新增 / ${duplicated} 段已存在`,
                    "success",
                );
            } else {
                showStatus(
                    `上传成功 ${plan.segments.length} 段，等待审核`,
                    "success",
                );
            }

            void loadApiSegments(true);
        } catch {
            showStatus("上传失败：网络异常，请稍后重试", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // ---- 拖拽：按住标题栏移动，限制在 playerWrap 内 ----
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const clampPosition = (leftValue: number, topValue: number): [number, number] => {
        const host = props.container;
        const maxLeft = Math.max(
            0,
            host.clientWidth - (panelEl?.offsetWidth ?? 0),
        );
        const maxTop = Math.max(
            0,
            host.clientHeight - (panelEl?.offsetHeight ?? 0),
        );
        return [
            Math.min(Math.max(0, leftValue), maxLeft),
            Math.min(Math.max(0, topValue), maxTop),
        ];
    };

    const onHeadPointerDown = (event: PointerEvent) => {
        if ((event.target as HTMLElement | null)?.closest("button")) return;

        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = left();
        startTop = top();

        headEl?.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    const onHeadPointerMove = (event: PointerEvent) => {
        if (!dragging) return;

        const [nextLeft, nextTop] = clampPosition(
            startLeft + event.clientX - startX,
            startTop + event.clientY - startY,
        );
        setLeft(nextLeft);
        setTop(nextTop);
    };

    const endDrag = (event: PointerEvent) => {
        if (!dragging) return;
        dragging = false;

        if (headEl?.hasPointerCapture(event.pointerId)) {
            headEl.releasePointerCapture(event.pointerId);
        }
    };

    const switchTab = (tab: JumpPanelTab) => {
        setActiveTab(tab);

        if (tab === "submit") prepareSubmitTab();
        if (
            tab === "view" &&
            uiState.config.useCloudSegments &&
            !apiLoaded()
        ) {
            void loadApiSegments();
        }
    };

    // 外部（content / popup）请求打开窗口时，切到对应页并夹紧位置
    createEffect(
        on([panelOpen, panelTab], ([open, tab]) => {
            if (!open) return;

            setActiveTab(tab);
            if (tab === "submit") prepareSubmitTab();
            if (
                tab === "view" &&
                uiState.config.useCloudSegments &&
                !apiLoaded()
            ) {
                void loadApiSegments();
            }

            requestAnimationFrame(() => {
                const [nextLeft, nextTop] = clampPosition(left(), top());
                setLeft(nextLeft);
                setTop(nextTop);
            });
        }),
    );

    // 关闭云端片段时把「已加载」标记复位，重新开启后会再拉一次
    createEffect(() => {
        if (!uiState.config.useCloudSegments) {
            setApiLoaded(false);
        }
    });

    // ---- 私人 ID：首次使用时自动生成并持久化 ----
    onMount(() => {
        void getOrCreateUserID()
            .then(setUserID)
            .catch(() => {
                // 读取失败时保持空值；上传前会提示「私人 ID 至少需要 N 个字符」
            });
    });

    return (
        <div
            ref={panelEl}
            class="bmc-panel"
            hidden={!panelOpen()}
            style={{ left: `${left()}px`, top: `${top()}px` }}
        >
            <div
                ref={headEl}
                class="bmc-panel-head"
                onPointerDown={onHeadPointerDown}
                onPointerMove={onHeadPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <button
                    type="button"
                    class="bmc-tab"
                    classList={{ "is-active": activeTab() === "view" }}
                    onClick={() => switchTab("view")}
                >
                    查看
                </button>
                <button
                    type="button"
                    class="bmc-tab"
                    classList={{ "is-active": activeTab() === "submit" }}
                    onClick={() => switchTab("submit")}
                >
                    设置
                </button>
                <button
                    type="button"
                    class="bmc-close"
                    title="关闭"
                    onClick={() => closePanelState()}
                >
                    ×
                </button>
            </div>

            <div class="bmc-body">
                <Show
                    when={activeTab() === "view"}
                    fallback={
                        <>
                            {/* 设置页 */}
                            <div class="bmc-section-head">
                                <span>编辑片段</span>
                                <button
                                    type="button"
                                    class="bmc-help"
                                    title="点击查看设置说明"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void browser.runtime.sendMessage({
                                            type: "OPEN_HELP_PAGE",
                                        });
                                    }}
                                >
                                    ?
                                </button>
                                <span
                                    class="bmc-status"
                                    style={{ color: statusColor() }}
                                    title={statusText()}
                                >
                                    {statusText()}
                                </span>
                                <span>
                                    已保存 {uiState.config.segments.length} 个
                                </span>
                            </div>

                            <div class="bmc-actions">
                                <button
                                    type="button"
                                    class="bmc-action"
                                    disabled={!editing()}
                                    onClick={importStartTime}
                                >
                                    导入时间到开头
                                </button>
                                <button
                                    type="button"
                                    class="bmc-action"
                                    disabled={!editing()}
                                    onClick={importEndTime}
                                >
                                    导入时间到结尾
                                </button>
                            </div>

                            <div class="bmc-editor">
                                <input
                                    type="text"
                                    value={editStartText()}
                                    placeholder="00:00:00"
                                    disabled={!editing()}
                                    onInput={(event) =>
                                        setEditStartText(
                                            event.currentTarget.value,
                                        )
                                    }
                                />
                                <select
                                    value={editKind()}
                                    disabled={!editing()}
                                    onChange={(event) =>
                                        onKindChange(
                                            event.currentTarget.value === "next"
                                                ? "next"
                                                : "skip",
                                        )
                                    }
                                >
                                    <option value="skip">
                                        {KIND_LABELS.skip}
                                    </option>
                                    <option value="next">
                                        {KIND_LABELS.next}
                                    </option>
                                </select>
                                <input
                                    type="text"
                                    value={editEndText()}
                                    placeholder="00:00:00"
                                    disabled={!editing()}
                                    onInput={(event) =>
                                        setEditEndText(
                                            event.currentTarget.value,
                                        )
                                    }
                                />
                            </div>

                            <div class="bmc-actions">
                                <button
                                    type="button"
                                    class="bmc-action"
                                    disabled={!editing()}
                                    onClick={preview}
                                >
                                    预览
                                </button>
                                <button
                                    type="button"
                                    class="bmc-action"
                                    disabled={!editing()}
                                    onClick={seekToStart}
                                >
                                    定位头
                                </button>
                                <button
                                    type="button"
                                    class="bmc-action"
                                    disabled={!editing()}
                                    onClick={seekToEnd}
                                >
                                    定位尾
                                </button>
                                <button
                                    type="button"
                                    class="bmc-action"
                                    classList={{
                                        "is-edit": !editing(),
                                        "is-primary": editing(),
                                    }}
                                    disabled={!editing() && !hasTarget()}
                                    onClick={toggleEdit}
                                >
                                    {editing() ? "保存" : "编辑"}
                                </button>
                            </div>

                            <div class="bmc-divider" />

                            <Show
                                when={uiState.config.segments.length > 0}
                                fallback={<EmptyHint text="暂无片段" />}
                            >
                                <div class="bmc-seg-list">
                                    <For each={uiState.config.segments}>
                                        {(segment) => (
                                            <SegmentRow
                                                segment={segment}
                                                compact
                                                selected={
                                                    segment.id === selectedId()
                                                }
                                                onClick={() =>
                                                    selectSegment(segment)
                                                }
                                                onDelete={() =>
                                                    deleteSegmentById(
                                                        segment.id,
                                                    )
                                                }
                                            />
                                        )}
                                    </For>
                                </div>
                            </Show>

                            <div
                                class="bmc-seg bmc-seg-new"
                                onClick={startNewSegment}
                            >
                                ＋ 新建片段（当前进度）
                            </div>

                            <Show when={uiState.config.useCloudSegments}>
                                <div class="bmc-divider" />

                                <SectionHeader
                                    title="私人 ID"
                                    hint="首次使用会自动生成并保存在本地；也可以替换成你已有的私人 ID。此 ID 仅用于标识上传者，服务端不会收集其他信息。"
                                />

                                <input
                                    class="bmc-input"
                                    type="password"
                                    autocomplete="off"
                                    spellcheck={false}
                                    placeholder={`至少 ${MIN_USER_ID_LENGTH} 个字符`}
                                    value={userID()}
                                    onInput={(event) =>
                                        setUserID(
                                            event.currentTarget.value.trim(),
                                        )
                                    }
                                />

                                <SectionHeader
                                    title="上传"
                                    hint="上传后需要服务端审核，云端列表可能延迟 1–2 分钟。若上次其实已提交成功、这次提示「服务器已有该片段」，会按成功处理并清理本地片段，不会重复提交。"
                                />

                                <button
                                    type="button"
                                    class="bmc-submit"
                                    disabled={submitting()}
                                    onClick={() => void handleSubmit()}
                                >
                                    {submitting()
                                        ? "上传中…"
                                        : "上传到 bsbsb.top"}
                                </button>
                            </Show>
                        </>
                    }
                >
                    {/* 查看页 */}
                    <SectionHeader
                        title="手动片段"
                        extra={`${uiState.config.segments.length} 个`}
                    />
                    <Show
                        when={uiState.config.segments.length > 0}
                        fallback={
                            <EmptyHint text="暂无手动片段，去「设置」里新建" />
                        }
                    >
                        <For each={uiState.config.segments}>
                            {(segment) => <SegmentRow segment={segment} />}
                        </For>
                    </Show>

                    <Show
                        when={uiState.config.useCloudSegments}
                        fallback={
                            <>
                                <SectionHeader
                                    title="云端片段"
                                    extra="已关闭"
                                />
                                <EmptyHint text="云端片段已关闭，可在设置页开启" />
                            </>
                        }
                    >
                        <SectionHeader
                            title="云端片段"
                            extra={`${cloudSegments().length} 个`}
                        />
                        <Show
                            when={cloudSegments().length > 0}
                            fallback={<EmptyHint text="暂无云端片段" />}
                        >
                            <For each={cloudSegments()}>
                                {(segment) => <SegmentRow segment={segment} />}
                            </For>
                        </Show>

                        <button
                            type="button"
                            class="bmc-refresh"
                            disabled={refreshing()}
                            onClick={() => void refreshCloud()}
                        >
                            {refreshing() ? "刷新中…" : "刷新云端片段"}
                        </button>

                        <div class="bmc-hint">
                            服务器可能有延迟，建议等待 1–2 分钟后再刷新。
                        </div>
                    </Show>
                </Show>
            </div>
        </div>
    );
}

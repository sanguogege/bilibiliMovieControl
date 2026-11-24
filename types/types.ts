// 全项目共享的类型定义集中在此文件，实现文件里不再声明 type / interface。

// ============================================================
// 时间
// ============================================================
export interface TimePoint {
    h: number; // 小时
    m: number; // 分钟
    s: number; // 秒
}

// ============================================================
// 片段（统一模型）
// ============================================================

/** skip = 片段跳过；next = 到点切换下一 P */
export type SegmentKind = "skip" | "next";

/** manual = 用户手动设置；api = 从 BilibiliSponsorBlock 查到或提交后返回的 */
export type SegmentSource = "manual" | "api";

export interface SkipSegment {
    id: string;
    start: number; // 秒
    end: number; // 秒；next 类型 end <= start 表示"到视频结尾"
    kind: SegmentKind;
    source: SegmentSource;
}

// ============================================================
// 配置
// ============================================================

export interface Config {
    segments: SkipSegment[];
    /** 是否把云端片段并入播放判断 */
    useCloudSegments: boolean;
}

// ============================================================
// 历史记录
// ============================================================

export interface HistoryConfig extends Omit<Config, "useCloudSegments"> {
    id: number;
    title: string;
    url: string;
    time: number;
}

export interface HistoryListConfig {
    maxLength: number;
    isPinned: boolean;
    items: HistoryConfig[];
}

/** 历史归档类型：latest = 自动存档，pinned = 手动存档 */
export type HistoryKind = "latest" | "pinned";

/** 自动存档 / 手动存档共用的快照字段 */
export interface HistorySnapshot {
    id?: number;
    title: string;
    url: string;
    segments: SkipSegment[];
}

// ============================================================
// 页面内悬浮条
// ============================================================

// ============================================================
// 播放页 UI 显示开关
// ============================================================

/**
 * 播放页顶部「状态那一行」的显示开关。
 * 只影响显示，不影响片段、云端查询和跳转逻辑。
 */
export interface UiVisibility {
    /** 片段查看按钮 */
    actionView: boolean;
    /** 片段设置按钮 */
    actionSubmit: boolean;
    /** 「查看云端数据→」链接 */
    cloudLink: boolean;
    /** ⏭ 片段跳过 N 段 */
    statusSkip: boolean;
    /** 🔚 下一 P 时间 */
    statusNext: boolean;
    /** ☁ 云端 N 个 */
    statusCloud: boolean;
    /** 播放器控制条上的进度条标记（紫/红色块） */
    progressMarkers: boolean;
    /** 控制条自动隐藏后，色块改画在底部原生细进度条上（不再悬空） */
    idleMarkers: boolean;
}

// ============================================================
// 内容脚本操作区（按钮组 + 浮动窗口）
// ============================================================

export type JumpPanelTab = "view" | "submit";

export type JumpPanelConfig = Config;

/** 提交页交给外层（content）的数据 */
export interface JumpPanelSubmitPayload {
    bvid: string;
    videoDuration: number;
    userID: string;
    segments: SubmitSegmentInput[];
}

/** 浮动窗口需要 content 提供的回调 */
export interface JumpPanelHandlers {
    onSubmit: (payload: JumpPanelSubmitPayload) => Promise<SubmitResult>;
    /** 上传成功后把新片段先乐观合并进播放规则 */
    onUploaded?: (created: unknown) => void;
    /** 重新拉取云端片段（force = 绕过缓存） */
    onRefreshCloud?: (force?: boolean) => Promise<SkipSegment[]>;
    /** 新增或更新一个手动片段（按 id upsert） */
    onSaveSegment: (segment: SkipSegment) => Promise<void>;
    onDeleteSegment: (id: string) => Promise<void>;
    onSeek: (seconds: number) => void;
    /** 临时把片段注入播放判断，预览一次 */
    onPreview: (segment: SkipSegment) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
}

// ============================================================
// BilibiliSponsorBlock API
// ============================================================

/**
 * /api/skipSegments 返回的单个片段（已归一化）。
 * actionType 已知取值：skip / mute / full / poi / chapter，服务端可能新增。
 */
export interface ApiSegment {
    id: string; // 片段 UUID
    cid: string; // 所属分P 的 cid，未知时为空串
    start: number; // 开始时间（秒）
    end: number; // 结束时间（秒）
    category: string; // intro / outro / sponsor / ...
    actionType: string; // skip / mute / full / poi / chapter
    locked: number;
    votes: number;
    videoDuration: number; // 提交时的视频时长（秒）
}

/** GET /api/segmentInfo 返回的片段详情 */
export interface ApiSegmentInfo {
    videoID: string;
    cid: string;
    startTime: number;
    endTime: number;
    votes: number;
    locked: number;
    UUID: string;
    userID: string; // 提交者的公开 ID
    timeSubmitted: number; // 提交时间戳（毫秒；兼容秒级旧数据）
    views: number;
    category: string;
    actionType: string;
    videoDuration: number;
    hidden: number; // 0 未隐藏 / 1 已隐藏 / 2 自动隐藏
    reputation: number; // 提交者声誉
    shadowHidden: number; // 0 未暗藏 / 1 暗藏
    hashedVideoID?: string;
    userAgent?: string;
}

export type VoteType = 0 | 1 | 20; // 点踩 / 点赞 / 撤销

export interface SegmentInfoResult {
    ok: boolean;
    info?: ApiSegmentInfo;
    reason?: ApiLookupReason;
    message?: string;
}

export interface VoteResult {
    ok: boolean;
    reason?: ApiLookupReason;
    message?: string;
}

export type ApiLookupReason =
    | "bad-bvid"
    | "bad-request"
    | "bad-json"
    | "duplicate"
    | "network"
    | "not-found"
    | "rate-limited"
    | "rejected"
    | "test-env"
    | "timeout"
    | `http-${number}`;

export interface ApiLookupResult {
    ok: boolean;
    segments: ApiSegment[];
    fromCache: boolean;
    reason?: ApiLookupReason;
}

/** 提交时单个片段（秒） */
export interface SubmitSegmentInput {
    start: number;
    end: number;
    category?: string;
    actionType?: string;
}

/** 一次上传计划：提交参数 + 来源手动片段 id（上传成功后按 id 清理本地片段） */
export interface SubmitPlan {
    segments: SubmitSegmentInput[];
    segmentIds: string[];
}

export interface SubmitSegmentsParams {
    bvid: string;
    cid?: string;
    /** 分P 序号，缺省为 1 */
    page?: number;
    videoDuration: number;
    userID: string;
    segments: SubmitSegmentInput[];
}

/** bilibili pagelist 里的分P信息（用于补 cid / 规范时长） */
export interface BiliVideoPage {
    cid: string;
    duration: number;
}

/** 分P 列表项：cid 本身不含分P 号，需要靠 pagelist 映射 */
export interface BiliVideoPageInfo extends BiliVideoPage {
    page: number;
    title?: string;
}

export interface SubmitResult {
    ok: boolean;
    reason?: ApiLookupReason;
    created?: unknown;
    /** 服务端返回的错误文本（如果有） */
    message?: string;
}

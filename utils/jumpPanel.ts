import type {
    JumpPanelConfig,
    SkipSegment,
    SubmitPlan,
    SubmitSegmentInput,
} from "@/types/types";
import { effectiveEnd, MIN_SEGMENT_SECONDS } from "@/utils/segments";

/**
 * 单个手动片段转换成提交参数：
 * - skip → intro（从 0 秒开始）或 sponsor
 * - next → outro（到结束位置或视频结尾）
 * 云端来源（source=api）与过短片段不参与提交，返回 null。
 */
function toSubmitInput(
    segment: SkipSegment,
    videoDuration: number,
): SubmitSegmentInput | null {
    if (segment.source === "api") return null;

    if (segment.kind === "skip") {
        const end =
            videoDuration > 0 ? Math.min(segment.end, videoDuration) : segment.end;
        if (end - segment.start < MIN_SEGMENT_SECONDS) return null;

        return {
            start: segment.start,
            end,
            category: segment.start <= 1 ? "intro" : "sponsor",
            actionType: "skip",
        };
    }

    const end = effectiveEnd(segment, videoDuration);
    if (end - segment.start < MIN_SEGMENT_SECONDS) return null;

    return {
        start: segment.start,
        end,
        category: "outro",
        actionType: "skip",
    };
}

/**
 * 把手动片段转换成待提交的片段，同时保留来源片段 id：
 * 上传成功后调用方按 segmentIds 把这些片段从本地列表删掉。
 */
export function buildSubmitPlan(
    config: JumpPanelConfig,
    videoDuration: number,
): SubmitPlan {
    const plan: SubmitPlan = { segments: [], segmentIds: [] };

    for (const segment of config.segments) {
        const input = toSubmitInput(segment, videoDuration);
        if (!input) continue;

        plan.segments.push(input);
        plan.segmentIds.push(segment.id);
    }

    return plan;
}

/** 只取提交参数（兼容旧调用方与测试） */
export function buildSubmitSegments(
    config: JumpPanelConfig,
    videoDuration: number,
): SubmitSegmentInput[] {
    return buildSubmitPlan(config, videoDuration).segments;
}

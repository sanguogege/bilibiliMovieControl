import type { SubmitResult } from "@/types/types";

/**
 * 上传结果的语义分类：
 * - created：200，服务端已写入（可能仍在审核）
 * - duplicate：409，服务端已有完全相同的片段。包含「上次请求其实成功、但客户端没收到响应」
 *   的情况，所以按成功处理，避免用户反复点击都只得到「已经上传过」
 * - unknown：timeout / network，请求可能已经送达，服务端是否写入不确定
 * - failed：400 / 403 / 429 / 5xx 等确定失败
 */
export type UploadOutcome = "created" | "duplicate" | "unknown" | "failed";

export function classifySubmitResult(
    result: SubmitResult | undefined,
): UploadOutcome {
    if (result?.ok) return "created";
    if (result?.reason === "duplicate") return "duplicate";
    if (result?.reason === "timeout" || result?.reason === "network") {
        return "unknown";
    }
    return "failed";
}

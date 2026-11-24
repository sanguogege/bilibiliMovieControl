/**
 * BilibiliSponsorBlock 接口错误码 → 用户可读文案。
 * 上传（浮动窗口）与社区页共用同一份，避免两边键集不一致。
 */
export const REASON_TEXT: Record<string, string> = {
    "bad-bvid": "视频 BV 号无效",
    "bad-request": "请求参数不完整",
    "bad-json": "接口返回数据异常",
    rejected: "被服务端拒绝（403）",
    duplicate: "服务端已有完全相同的片段（409）",
    "rate-limited": "操作过于频繁或上一次提交仍在处理，请稍后重试",
    "test-env": "测试环境不支持该操作，请使用正式环境",
    timeout: "请求超时，请稍后重试",
    network: "网络异常，请检查网络后重试",
    "not-found": "接口未找到",
};

/** 已知错误码取文案，未知的拼成「<fallback>（<reason>）」 */
export const reasonText = (
    reason: string | undefined,
    fallback = "请求失败",
): string => {
    const known = REASON_TEXT[reason ?? ""];
    if (known) return known;

    return `${fallback}（${reason || "未知错误"}）`;
};

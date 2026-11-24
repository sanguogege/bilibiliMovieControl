import { describe, expect, test } from "bun:test";
import { classifySubmitResult } from "../utils/upload";
import type { SubmitResult } from "../types/types";

const result = (patch: Partial<SubmitResult>): SubmitResult => ({
    ok: false,
    ...patch,
});

describe("classifySubmitResult", () => {
    test("200 视为已创建", () => {
        expect(classifySubmitResult({ ok: true, created: [] })).toBe(
            "created",
        );
    });

    test("409 duplicate 视为服务端已存在（含上次成功但客户端没收到响应）", () => {
        expect(
            classifySubmitResult(result({ reason: "duplicate" })),
        ).toBe("duplicate");
    });

    test("timeout / network 视为结果未知，请求可能已送达", () => {
        expect(classifySubmitResult(result({ reason: "timeout" }))).toBe(
            "unknown",
        );
        expect(classifySubmitResult(result({ reason: "network" }))).toBe(
            "unknown",
        );
    });

    test("其余错误码视为确定失败", () => {
        for (const reason of [
            "bad-bvid",
            "bad-request",
            "rejected",
            "rate-limited",
            "test-env",
            "http-500",
        ] as const) {
            expect(classifySubmitResult(result({ reason }))).toBe("failed");
        }

        expect(classifySubmitResult(undefined)).toBe("failed");
    });
});

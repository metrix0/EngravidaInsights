// src/app/api/analyze/route.ts
import { NextResponse } from "next/server";

import { messageToConversations } from "@/lib/conversations/messagesToConversations";
import { gatherPendingConversationsToAnalysis } from "@/lib/conversations/gatherPendingConversationsToAnalysis";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const inactivityHours = Number(searchParams.get("inactivity_hours") ?? 6);
        const limit = Number(searchParams.get("limit") ?? 1000);

        console.log("[/api/analyze] starting pipeline", {
            inactivity_hours: inactivityHours,
            limit,
        });

        console.log("[/api/analyze] converting pending messages into conversations");

        const createdConversations = await messageToConversations({
            inactivityHours,
            limit,
        });

        console.log("[/api/analyze] messages converted into conversations", {
            conversations_created: createdConversations.length,
        });

        console.log("[/api/analyze] gathering pending conversations to analysis");

        const results = await gatherPendingConversationsToAnalysis({
            limit,
        });

        console.log("[/api/analyze] pipeline finished", {
            conversations_processed: results.length,
            succeeded: results.filter((item) => item.ok).length,
            failed: results.filter((item) => !item.ok).length,
        });

        return NextResponse.json({
            ok: true,
            results,
        });
    } catch (error) {
        console.error("[/api/analyze] pipeline failed", error);

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to process analyze pipeline",
            },
            { status: 500 }
        );
    }
}
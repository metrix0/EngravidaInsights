// src/app/api/analyze/route.ts
import { NextResponse } from "next/server";

import { messageToConversations } from "@/lib/conversations/messagesToConversations";
import { gatherPendingConversationsToAnalysis } from "@/lib/conversations/gatherPendingConversationsToAnalysis";
import { matchMessagesSenderName } from "@/lib/messages/matchMessagesSenderName";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const inactivityHours = Number(searchParams.get("inactivity_hours") ?? 6);
        const limit = Number(searchParams.get("limit") ?? 9999);

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

        console.log("[/api/analyze] matching sender names");

        const senderNameMatch = await matchMessagesSenderName({
            limit,
        });

        console.log("[/api/analyze] sender names matched", {
            updated_messages: senderNameMatch.updated_messages,
            ready_conversations: senderNameMatch.ready_conversation_ids.length,
            skipped_conversations: senderNameMatch.skipped_conversation_ids.length,
        });

        console.log("[/api/analyze] gathering pending conversations to analysis");

        const results = await gatherPendingConversationsToAnalysis({
            limit,
            conversationIds: senderNameMatch.ready_conversation_ids,
        });

        console.log("[/api/analyze] pipeline finished", {
            conversations_processed: results.length,
            succeeded: results.filter((item) => item.ok).length,
            failed: results.filter((item) => !item.ok).length,
            skipped_missing_sender_name:
            senderNameMatch.skipped_conversation_ids.length,
        });

        return NextResponse.json({
            ok: true,
            sender_name_match: senderNameMatch,
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
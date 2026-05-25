// src/lib/conversations/gatherPendingConversationsToAnalysis.ts
import { supabase } from "@/lib/supabase/client";

import { analyzeConversation } from "@/lib/ai/analyzeConversation";
import { saveConversationAnalysis } from "@/lib/analysis/saveConversationAnalysis";
import { deriveAdEventsFromAnalysis } from "@/lib/ads/deriveAdEventsFromAnalysis";
import { sendMetaEvents } from "@/lib/ads/meta/sendMetaEvents";

import type { AnalyzeConversationInput, Conversation, Message } from "@/types";

export async function gatherPendingConversationsToAnalysis({
                                                               limit = 1000,
                                                           }: {
    limit?: number;
}) {
    const conversations = await getConversationsWithoutAnalysis(limit);

    console.log("[gatherPendingConversationsToAnalysis] gathered conversations without analysis", {
        conversations_found: conversations.length,
    });

    const results = [];

    for (const conversation of conversations) {
        try {
            console.log("[gatherPendingConversationsToAnalysis] preparing conversation", {
                conversation_id: conversation.id,
                client_id: conversation.client_id,
            });

            const messages = await getConversationMessages(conversation.id);

            const analysisInput: AnalyzeConversationInput = {
                conversation_id: conversation.id,
                client_id: conversation.client_id,

                started_at: conversation.started_at,
                ended_at: conversation.ended_at ?? conversation.started_at,

                attendant_id: conversation.attendant_id,
                unit_id: conversation.unit_id,
                service_id: conversation.service_id,

                conversationText: buildConversationText(messages),
            };

            console.log("[gatherPendingConversationsToAnalysis] analyzing conversation with AI", {
                conversation_id: conversation.id,
                messages_count: messages.length,
            });

            const analysis = await analyzeConversation(analysisInput);

            console.log("[gatherPendingConversationsToAnalysis] analyzed conversation with AI", {
                conversation_id: analysis.conversation_id,
                short_label: analysis.short_label,
                goal: analysis.conversation_goal,
                status: analysis.goal_status,
                final_state: analysis.customer_final_state,
            });

            await saveConversationAnalysis(analysis);

            const analysisId = await getConversationAnalysisId(analysis.conversation_id);

            await markConversationAsAnalyzed({
                conversationId: conversation.id,
                analysisId,
            });

            console.log("[gatherPendingConversationsToAnalysis] analysis and conversation saved to supabase", {
                conversation_id: conversation.id,
                conversation_analysis_id: analysisId,
            });

            const adEvents = deriveAdEventsFromAnalysis(analysis);

            console.log("[gatherPendingConversationsToAnalysis] ad events derived", {
                conversation_id: conversation.id,
                count: adEvents.length,
                ad_events: adEvents,
            });

            let metaResult = null;

            if (adEvents.length > 0) {
                const { data: client, error: clientError } = await supabase
                    .from("clients")
                    .select("phone")
                    .eq("id", analysis.client_id)
                    .single();

                if (clientError) {
                    throw clientError;
                }

                metaResult = await sendMetaEvents({
                    events: adEvents,
                    phone: client.phone,
                    conversation_id: analysis.conversation_id,
                });

                console.log("[gatherPendingConversationsToAnalysis] ad events sent to meta", {
                    conversation_id: conversation.id,
                    meta: metaResult,
                });
            } else {
                console.log("[gatherPendingConversationsToAnalysis] no ad events sent to meta", {
                    conversation_id: conversation.id,
                });
            }

            results.push({
                ok: true,
                conversation_id: conversation.id,
                client_id: conversation.client_id,
                conversation_analysis_id: analysisId,
                short_label: analysis.short_label,
                ad_events: adEvents,
                meta: metaResult,
            });
        } catch (error) {
            console.error("[gatherPendingConversationsToAnalysis] failed processing conversation", {
                conversation_id: conversation.id,
                client_id: conversation.client_id,
                error,
            });

            results.push({
                ok: false,
                conversation_id: conversation.id,
                client_id: conversation.client_id,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to analyze conversation",
            });
        }
    }

    return results;
}

async function getConversationsWithoutAnalysis(limit: number): Promise<Conversation[]> {
    const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .is("conversation_analysis_id", null)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: true })
        .limit(limit);

    if (error) {
        throw new Error(
            `Failed to fetch conversations without analysis: ${error.message}`
        );
    }

    return (data ?? []) as Conversation[];
}

async function getConversationMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true })
        .order("sequence_index", { ascending: true });

    if (error) {
        throw new Error(
            `Failed to fetch conversation messages: ${error.message}`
        );
    }

    return (data ?? []) as Message[];
}

async function getConversationAnalysisId(conversationId: string): Promise<string> {
    const { data, error } = await supabase
        .from("conversation_analysis")
        .select("id")
        .eq("conversation_id", conversationId)
        .single();

    if (error) {
        throw new Error(
            `Failed to fetch conversation analysis id: ${error.message}`
        );
    }

    return data.id;
}

async function markConversationAsAnalyzed({
                                              conversationId,
                                              analysisId,
                                          }: {
    conversationId: string;
    analysisId: string;
}) {
    const { error } = await supabase
        .from("conversations")
        .update({
            conversation_analysis_id: analysisId,
        })
        .eq("id", conversationId);

    if (error) {
        throw new Error(
            `Failed to mark conversation as analyzed: ${error.message}`
        );
    }
}

function buildConversationText(messages: Message[]): string {
    return messages
        .map((message) => {
            const date = new Date(message.sent_at).toLocaleString("pt-BR");
            const sender = getSenderLabel(message);

            return `[${date}] ${sender}: ${message.text}`;
        })
        .join("\n");
}

function getSenderLabel(message: Message): string {
    if (message.sender_type === "client") return "Cliente";

    if (message.sender_type === "attendant") {
        return message.sender_name ?? "Atendente";
    }

    if (message.sender_type === "bot") return "Bot";

    return "Sistema";
}
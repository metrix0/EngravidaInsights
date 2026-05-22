// scripts/test-save-analysis.ts
import WebSocket from "ws";
import type { ConversationAnalysis } from "../src/types";

(globalThis as any).WebSocket = WebSocket;

async function main() {
    const { supabase } = await import("../src/lib/supabase/client");
    const { saveConversationAnalysis } = await import(
        "../src/lib/analysis/saveConversationAnalysis"
        );

    const now = new Date();
    const startedAt = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
    const endedAt = now.toISOString();

    const randomPhone = `+55199999${Math.floor(Math.random() * 999999)
        .toString()
        .padStart(6, "0")}`;

    const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
            name: "Cliente Teste Análise",
            phone: randomPhone,
            email: null,
            external_ids: { test_seed: true },
            first_seen_at: startedAt,
            last_interaction_at: endedAt,
        })
        .select("id")
        .single();

    if (clientError) {
        throw clientError;
    }

    const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
            client_id: client.id,
            source: "manual_import",
            started_at: startedAt,
            ended_at: endedAt,
            attendant_id: null,
            attendant_chat_name: "Atendente Teste",
            unit_id: null,
            service_id: null,
        })
        .select("id")
        .single();

    if (conversationError) {
        throw conversationError;
    }

    const analysis: ConversationAnalysis = {
        conversation_id: conversation.id,
        client_id: client.id,

        started_at: startedAt,
        ended_at: endedAt,

        attendant_id: null,
        unit_id: null,
        service_id: null,

        customer_start_intent: "Cliente quer agendar uma consulta online.",

        conversation_goal: "schedule_consultation",
        goal_status: "achieved",
        customer_final_state: "scheduled",

        outcome_events: [
            {
                type: "information_requested",
                occurred_at: startedAt,
                confidence: 0.95,
            },
            {
                type: "consultation_offered",
                occurred_at: startedAt,
                confidence: 0.92,
            },
            {
                type: "information_answered",
                occurred_at: startedAt,
                confidence: 0.9,
            },
            {
                type: "price_presented",
                occurred_at: startedAt,
                confidence: 0.85,
            },
            {
                type: "appointment_scheduled",
                occurred_at: endedAt,
                confidence: 0.97,
            },
        ],

        dropoff: {
            happened: false,
            moment: null,
            likely_reason: null,
            confidence: 0.95,
        },

        objections: [],

        sentiment: {
            customer_sentiment: "positive",
            satisfaction_score: 88,
            confidence: 0.86,
        },

        attendant_quality: {
            clarity_score: 90,
            empathy_score: 86,
            proactivity_score: 88,
            objection_handling_score: 82,
            response_speed_score: 91,
            overall_score: 88,
        },

        response_timing: {
            first_human_response_time_seconds: 75,
            average_human_response_time_seconds: 110,
            longest_human_delay_seconds: 210,
        },

        resolution: {
            resolved: true,
            resolution_score: 92,
            reasoning_category: "customer_scheduled",
        },

        short_label: "Consulta agendada",
        notable: true,
        notable_reason: "Cliente demonstrou intenção clara e agendou consulta.",
    };

    await saveConversationAnalysis(analysis);

    console.log("Seed analysis saved:");
    console.log({
        client_id: client.id,
        conversation_id: conversation.id,
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
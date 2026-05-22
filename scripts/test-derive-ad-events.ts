// scripts/test-derive-ad-events.ts
import WebSocket from "ws";
import type { ConversationAnalysis } from "../src/types";

(globalThis as any).WebSocket = WebSocket;

async function main() {
    const { supabase } = await import("../src/lib/supabase/client");
    const { deriveAdEventsFromAnalysis } = await import(
        "../src/lib/ads/deriveAdEventsFromAnalysis"
        );

    const conversationId = "6e93ba6d-9dd8-4064-a444-13bea159a501";

    const { data, error } = await supabase
        .from("conversation_analysis")
        .select(`
            conversation_id,
            client_id,
            started_at,
            ended_at,
            attendant_id,
            unit_id,
            service_id,
            customer_start_intent,
            conversation_goal,
            goal_status,
            customer_final_state,
            outcome_events,
            dropoff_happened,
            dropoff_moment,
            dropoff_likely_reason,
            dropoff_confidence,
            objections,
            customer_sentiment,
            satisfaction_score,
            sentiment_confidence,
            clarity_score,
            empathy_score,
            proactivity_score,
            objection_handling_score,
            response_speed_score,
            attendant_quality_score,
            first_human_response_time_seconds,
            average_human_response_time_seconds,
            longest_human_delay_seconds,
            resolution_result,
            resolution_score,
            resolution_reasoning_category,
            short_label,
            notable,
            notable_reason
        `)
        .eq("conversation_id", conversationId)
        .single();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("No analysis found for this conversation");
    }

    const analysis: ConversationAnalysis = {
        conversation_id: data.conversation_id,
        client_id: data.client_id,

        started_at: data.started_at,
        ended_at: data.ended_at,

        attendant_id: data.attendant_id,
        unit_id: data.unit_id,
        service_id: data.service_id,

        customer_start_intent: data.customer_start_intent,

        conversation_goal: data.conversation_goal,
        goal_status: data.goal_status,
        customer_final_state: data.customer_final_state,

        outcome_events: data.outcome_events ?? [],

        dropoff: {
            happened: data.dropoff_happened,
            moment: data.dropoff_moment,
            likely_reason: data.dropoff_likely_reason,
            confidence: data.dropoff_confidence,
        },

        objections: data.objections ?? [],

        sentiment: {
            customer_sentiment: data.customer_sentiment,
            satisfaction_score: data.satisfaction_score,
            confidence: data.sentiment_confidence,
        },

        attendant_quality: {
            clarity_score: data.clarity_score,
            empathy_score: data.empathy_score,
            proactivity_score: data.proactivity_score,
            objection_handling_score: data.objection_handling_score,
            response_speed_score: data.response_speed_score,
            overall_score: data.attendant_quality_score,
        },

        response_timing: {
            first_human_response_time_seconds:
            data.first_human_response_time_seconds,
            average_human_response_time_seconds:
            data.average_human_response_time_seconds,
            longest_human_delay_seconds: data.longest_human_delay_seconds,
        },

        resolution: {
            resolved:
                data.resolution_result === "resolved"
                    ? true
                    : data.resolution_result === "not_resolved"
                        ? false
                        : "partial",
            resolution_score: data.resolution_score,
            reasoning_category: data.resolution_reasoning_category,
        },

        short_label: data.short_label,
        notable: data.notable,
        notable_reason: data.notable_reason,
    };

    const adEvents = deriveAdEventsFromAnalysis(analysis);

    console.log("Analysis from DB:");
    console.log({
        conversation_goal: analysis.conversation_goal,
        goal_status: analysis.goal_status,
        customer_final_state: analysis.customer_final_state,
        resolution: analysis.resolution,
        outcome_events: analysis.outcome_events,
    });

    console.log("Derived ad events:");
    console.log(JSON.stringify(adEvents, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
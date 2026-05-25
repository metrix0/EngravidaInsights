// src/lib/ai/analyzeConversation.ts
import { groq } from "./groq";
import { conversationAnalysisSchema } from "./conversationAnalysisSchema";
import type { AnalyzeConversationInput, ConversationAnalysis } from "@/types";

const analysisModel = process.env.GROQ_MODEL_ANALYSIS ?? "openai/gpt-oss-120b";

export async function analyzeConversation({
                                              conversation_id,
                                              client_id,
                                              started_at,
                                              ended_at,
                                              attendant_id,
                                              unit_id,
                                              service_id,
                                              conversationText,
                                          }: AnalyzeConversationInput): Promise<ConversationAnalysis> {
    const response = await groq.chat.completions.create({
        model: analysisModel,
        temperature: 0,
        response_format: {
            type: "json_object",
        },
        messages: [
            {
                role: "system",
                content: `
You analyze WhatsApp/Blip conversations between fertility clinic attendants and clients.

Return ONLY valid JSON.
Do not use markdown.
Do not wrap in code blocks.
Do not add comments.
Do not add extra fields.
Do not omit required fields.

Rules:
- Be conservative. If unclear, use "unclear".
- Confidence must be from 0 to 1.
- Scores must be integers from 0 to 100.
- Use null when a timestamp or reason cannot be inferred.
- Do not invent events that are not supported by the conversation.
- response_timing must be based on message timestamps when possible.
- If the customer stopped responding after an important moment, mark dropoff.happened = true.
- If there is no clear dropoff, mark dropoff.happened = false and moment = null.
- For resolution.resolved, use exactly "true", "false", or "partial".
                `.trim(),
            },
            {
                role: "user",
                content: `
Return a JSON object with exactly this shape:

{
  "conversation_id": string,
  "client_id": string,
  "started_at": string,
  "ended_at": string,
  "attendant_id": string | null,
  "unit_id": string | null,
  "service_id": string | null,
  "customer_start_intent": string,
  "conversation_goal": "answer_information" | "schedule_consultation" | "reschedule_consultation" | "confirm_attendance" | "recover_inactive_lead" | "explain_treatment" | "handle_price_objection" | "collect_documents_or_exams" | "post_consultation_followup" | "other",
  "goal_status": "achieved" | "partially_achieved" | "not_achieved" | "unclear",
  "customer_final_state": "scheduled" | "rescheduled" | "confirmed_attendance" | "received_information" | "asked_to_think" | "objected_to_price" | "stopped_responding" | "redirected" | "not_qualified" | "unclear",
  "outcome_events": [],
  "dropoff": {
    "happened": boolean,
    "moment": "after_price" | "after_consultation_online" | "after_unit_presented" | "after_schedule_options" | "after_payment_info" | "after_medical_question" | "after_delay" | "unknown" | null,
    "likely_reason": string | null,
    "confidence": number
  },
  "objections": [],
  "sentiment": {
    "customer_sentiment": "positive" | "neutral" | "negative" | "anxious" | "confused" | "frustrated",
    "satisfaction_score": number,
    "confidence": number
  },
  "attendant_quality": {
    "clarity_score": number,
    "empathy_score": number,
    "proactivity_score": number,
    "objection_handling_score": number,
    "response_speed_score": number,
    "overall_score": number
  },
  "response_timing": {
    "first_human_response_time_seconds": number | null,
    "average_human_response_time_seconds": number | null,
    "longest_human_delay_seconds": number | null
  },
  "resolution": {
    "resolved": "true" | "false" | "partial",
    "resolution_score": number,
    "reasoning_category": "customer_got_answer" | "customer_scheduled" | "customer_confirmed" | "customer_not_qualified" | "customer_abandoned" | "attendant_failed_to_answer" | "unclear"
  },
  "short_label": string,
  "notable": boolean,
  "notable_reason": string | null
}

Conversation metadata:
conversation_id: ${conversation_id}
client_id: ${client_id}
started_at: ${started_at}
ended_at: ${ended_at}
attendant_id: ${attendant_id}
unit_id: ${unit_id}
service_id: ${service_id}

Conversation:
${conversationText}
                `.trim(),
            },
        ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
        throw new Error("AI did not return content");
    }

    let json: unknown;

    try {
        json = JSON.parse(content);
    } catch {
        console.error("Invalid AI JSON:", content);
        throw new Error("AI returned invalid JSON");
    }

    const parsed = conversationAnalysisSchema.parse(json);

    return {
        ...parsed,
        resolution: {
            ...parsed.resolution,
            resolved:
                parsed.resolution.resolved === "true"
                    ? true
                    : parsed.resolution.resolved === "false"
                        ? false
                        : "partial",
        },
    };
}
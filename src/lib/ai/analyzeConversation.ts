// src/lib/ai/analyzeConversation.ts
import { zodTextFormat } from "openai/helpers/zod";

import { openai } from "./openai";
import {
    conversationAnalysisSchema,
    type ConversationAnalysisOutput,
} from "./conversationAnalysisSchema";
import type { AnalyzeConversationInput } from "@/types";

const analysisModel = process.env.OPENAI_MODEL_ANALYSIS ?? "gpt-5.4-nano";

export async function analyzeConversation({
                                              conversation_id,
                                              client_id,
                                              started_at,
                                              ended_at,
                                              attendant_id,
                                              unit_id,
                                              service_id,
                                              conversationText,
                                          }: AnalyzeConversationInput): Promise<ConversationAnalysisOutput> {
    const response = await openai.responses.parse({
        model: analysisModel,

        input: [
            {
                role: "system",
                content: `
You analyze WhatsApp/Blip conversations between fertility clinic attendants and clients.

Return ONLY the structured output.

Rules:
- Be conservative. If unclear, use "unclear".
- Confidence must be from 0 to 1.
- Scores must be from 0 to 100.
- Use null when a timestamp or reason cannot be inferred.
- Do not invent events that are not supported by the conversation.
- response_timing must be based on message timestamps when possible.
- If the customer stopped responding after an important moment, mark dropoff.happened = true.
- If there is no clear dropoff, mark dropoff.happened = false and moment = null.
        `.trim(),
            },
            {
                role: "user",
                content: `
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

        text: {
            format: zodTextFormat(
                conversationAnalysisSchema,
                "conversation_analysis"
            ),
        },
    });

    const parsed = response.output_parsed;

    if (!parsed) {
        throw new Error("AI did not return a valid conversation analysis");
    }

    return parsed;
}
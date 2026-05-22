// src/app/api/analyze/route.ts
import { NextResponse } from "next/server";

import { analyzeConversation } from "@/lib/ai/analyzeConversation";
import { saveConversationAnalysis } from "@/lib/analysis/saveConversationAnalysis";
import { deriveAdEventsFromAnalysis } from "@/lib/ads/deriveAdEventsFromAnalysis";
import type { AnalyzeConversationInput } from "@/types";

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as AnalyzeConversationInput;

        const analysis = await analyzeConversation(body);

        await saveConversationAnalysis(analysis);

        const adEvents = deriveAdEventsFromAnalysis(analysis);

        return NextResponse.json({
            ok: true,
            analysis,
            ad_events: adEvents,
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to analyze conversation",
            },
            { status: 500 }
        );
    }
}
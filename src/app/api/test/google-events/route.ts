// src/app/api/test/google-events/route.ts
import { NextResponse } from "next/server";
import { sendGoogleEvents } from "@/lib/ads/google/sendGoogleEvents";

export async function GET() {
    const result = await sendGoogleEvents({
        conversation_id: "f529ae7b-aba7-4602-bf6c-9fe05a0d3780",
        conversation_ended_at: new Date().toISOString(),
        name: "josh test",
        phone: "5511999999999",
        email: "teste@gmail.com", // optional, but useful to test both
        events: [
            {
                type: "lead",
                meta_event_name: "CompleteRegistration",
                google_conversion_name: "qualified_lead",
                occurred_at: new Date().toISOString(),
                confidence: 0.9,
            },
        ],
    });

    return NextResponse.json(result);
}
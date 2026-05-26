// src/app/api/blip/messages/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        console.log("[/api/blip/messages] Received Blip payload:");
        console.dir(body, { depth: null });

        return NextResponse.json({
            ok: true,
            received: true,
        });
    } catch (error) {
        console.error("[/api/blip/messages] Failed to receive payload", error);

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to receive Blip message",
            },
            { status: 500 }
        );
    }
}
// src/app/api/_env-dump/route.ts
import { NextResponse } from "next/server";

const ALLOWED_KEYS = [
    "TINTIM_FORWARD_WEBHOOK_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "OPENAI_API_KEY",
    "OPENAI_MODEL_ANALYSIS",
    "GROQ_API_KEY",
    "GROQ_MODEL_ANALYSIS",
    "META_PIXEL_ID",
    "META_ACCESS_TOKEN",
    "META_TEST_EVENT_CODE",
    "META_PAGE_ID",
    "BLIP_CONTRACT_ID",
    "BLIP_AUTH_KEY",
    "BLIP_WEBHOOK_SECRET",
];

export async function GET(req: Request) {
    const key = req.headers.get("x-env-dump-key");

    if (key !== process.env.ENV_DUMP_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const envs: Record<string, string | undefined> = {};

    for (const name of ALLOWED_KEYS) {
        envs[name] = process.env[name];
    }

    return NextResponse.json(envs);
}
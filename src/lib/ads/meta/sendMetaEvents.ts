// src/lib/ads/meta/sendMetaEvents.ts
import crypto from "crypto";
import type { DerivedAdEvent } from "@/lib/ads/deriveAdEventsFromAnalysis";

type SendMetaEventsInput = {
    events: DerivedAdEvent[];
    phone: string | null;
    conversation_id: string;
};

const metaPixelId = process.env.META_PIXEL_ID;
const metaAccessToken = process.env.META_ACCESS_TOKEN;
const metaTestEventCode = process.env.META_TEST_EVENT_CODE;

export async function sendMetaEvents({
                                         events,
                                         phone,
                                         conversation_id,
                                     }: SendMetaEventsInput) {
    if (events.length === 0) {
        return {
            ok: true,
            skipped: true,
            reason: "No ad events",
        };
    }

    if (!phone) {
        return {
            ok: false,
            skipped: true,
            reason: "Client has no phone",
        };
    }

    if (!metaPixelId) {
        throw new Error("Missing META_PIXEL_ID");
    }

    if (!metaAccessToken) {
        throw new Error("Missing META_ACCESS_TOKEN");
    }

    const hashedPhone = hashPhone(phone);

    if (!hashedPhone) {
        return {
            ok: false,
            skipped: true,
            reason: "Invalid phone",
        };
    }

    const payload = {
        data: events.map((event) => ({
            event_name: event.meta_event_name,
            event_time: toUnixSeconds(event.occurred_at),
            event_id: `${conversation_id}:${event.type}`,

            // Important:
            // Using "chat" because we only have phone number.
            // "business_messaging" requires ctwa_clid/page_id/etc.
            action_source: "chat",

            user_data: {
                ph: [hashedPhone],
            },

            custom_data: {
                internal_event: event.type,
                conversation_id,
                confidence: event.confidence,
            },
        })),

        ...(metaTestEventCode
            ? {
                test_event_code: metaTestEventCode,
            }
            : {}),
    };

    const response = await fetch(
        `https://graph.facebook.com/v20.0/${metaPixelId}/events?access_token=${metaAccessToken}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        }
    );

    const json = await response.json();

    if (!response.ok) {
        throw new Error(`Meta CAPI error: ${JSON.stringify(json)}`);
    }

    return {
        ok: true,
        skipped: false,
        payload,
        response: json,
    };
}

function hashPhone(phone: string) {
    const normalized = normalizeBrazilPhone(phone);

    if (!normalized) return null;

    return crypto.createHash("sha256").update(normalized).digest("hex");
}

function normalizeBrazilPhone(phone: string) {
    const digits = phone.replace(/\D/g, "");

    if (!digits) return null;

    if (digits.startsWith("55")) {
        return digits;
    }

    if (digits.length === 10 || digits.length === 11) {
        return `55${digits}`;
    }

    return digits;
}

function toUnixSeconds(date: string) {
    return Math.floor(new Date(date).getTime() / 1000);
}
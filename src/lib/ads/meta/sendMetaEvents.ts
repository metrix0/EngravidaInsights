// src/lib/ads/meta/sendMetaEvents.ts
import crypto from "crypto";

import { supabase } from "@/lib/supabase/client";
import type { DerivedAdEvent } from "@/lib/ads/deriveAdEventsFromAnalysis";

type SendMetaEventsInput = {
    events: DerivedAdEvent[];
    phone: string | null;
    email?: string | null;
    conversation_id: string;
};

const metaPixelId = process.env.META_PIXEL_ID;
const metaAccessToken = process.env.META_ACCESS_TOKEN;
const metaTestEventCode = process.env.META_TEST_EVENT_CODE;

export async function sendMetaEvents({
                                         events,
                                         phone,
                                         email,
                                         conversation_id,
                                     }: SendMetaEventsInput) {
    if (events.length === 0) {
        return {
            ok: true,
            skipped: true,
            reason: "No ad events",
        };
    }

    const adEventIds = await createPendingMetaAdEvents({
        events,
        conversation_id,
    });

    try {
        if (!phone && !email) {
            await updateAdEventsStatus(adEventIds, "failed");

            return {
                ok: false,
                skipped: true,
                reason: "Client has no phone or email",
            };
        }

        if (!metaPixelId) {
            await updateAdEventsStatus(adEventIds, "failed");
            throw new Error("Missing META_PIXEL_ID");
        }

        if (!metaAccessToken) {
            await updateAdEventsStatus(adEventIds, "failed");
            throw new Error("Missing META_ACCESS_TOKEN");
        }

        const hashedPhone = phone ? hashPhone(phone) : null;
        const hashedEmail = email ? hashEmail(email) : null;

        if (!hashedPhone && !hashedEmail) {
            await updateAdEventsStatus(adEventIds, "failed");

            return {
                ok: false,
                skipped: true,
                reason: "Invalid phone and email",
            };
        }

        const payload = {
            data: events.map((event) => ({
                event_name: event.meta_event_name,
                event_time: toUnixSeconds(event.occurred_at),
                event_id: `${conversation_id}:${event.type}`,

                action_source: "chat",

                user_data: {
                    ...(hashedPhone ? { ph: [hashedPhone] } : {}),
                    ...(hashedEmail ? { em: [hashedEmail] } : {}),
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
            await updateAdEventsStatus(adEventIds, "failed");
            throw new Error(`Meta CAPI error: ${JSON.stringify(json)}`);
        }

        await updateAdEventsStatus(adEventIds, "sent");

        return {
            ok: true,
            skipped: false,
            payload,
            response: json,
        };
    } catch (error) {
        await updateAdEventsStatus(adEventIds, "failed");
        throw error;
    }
}

async function createPendingMetaAdEvents({
                                             events,
                                             conversation_id,
                                         }: {
    events: DerivedAdEvent[];
    conversation_id: string;
}) {
    const { data, error } = await supabase
        .from("ad_events")
        .insert(
            events.map((event) => ({
                conversation_id,
                event_type: event.type,
                platform: "Meta Ads",
                status: "pending",
                event_date: event.occurred_at,
            }))
        )
        .select("id");

    if (error) {
        throw error;
    }

    return (data ?? []).map((item) => item.id as string);
}

async function updateAdEventsStatus(
    adEventIds: string[],
    status: "pending" | "sent" | "failed"
) {
    if (adEventIds.length === 0) return;

    const { error } = await supabase
        .from("ad_events")
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .in("id", adEventIds);

    if (error) {
        throw error;
    }
}

function hashPhone(phone: string) {
    const normalized = normalizeBrazilPhone(phone);

    if (!normalized) return null;

    return hash(normalized);
}

function hashEmail(email: string) {
    const normalized = email.trim().toLowerCase();

    if (!normalized || !normalized.includes("@")) return null;

    return hash(normalized);
}

function hash(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
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
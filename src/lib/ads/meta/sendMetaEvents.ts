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

type ClientTracking = {
    id: string;
    external_contact_id: string | null;
    created_at: string | null;

    fbclid: string | null;
    fbc: string | null;
    fbp: string | null;
    ctwa_clid: string | null;

    gclid: string | null;
    gbraid: string | null;
    wbraid: string | null;

    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    utm_term: string | null;

    tracking_updated_at: string | null;
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

        const normalizedPhone = phone ? normalizeBrazilPhone(phone) : null;

        const hashedPhone = normalizedPhone ? hash(normalizedPhone) : null;
        const hashedEmail = email ? hashEmail(email) : null;

        const tracking = await getClientTracking({
            conversationId: conversation_id,
            normalizedPhone,
        });

        const userData = buildUserData({
            hashedPhone,
            hashedEmail,
            tracking,
        });

        if (Object.keys(userData).length === 0) {
            await updateAdEventsStatus(adEventIds, "failed");

            return {
                ok: false,
                skipped: true,
                reason: "No valid user_data",
            };
        }

        const payload = {
            data: events.map((event) => ({
                event_name: event.meta_event_name,
                event_time: toUnixSeconds(event.occurred_at),
                event_id: `${conversation_id}:${event.type}`,

                action_source: "chat",

                user_data: userData,

                custom_data: {
                    internal_event: event.type,
                    conversation_id,
                    confidence: event.confidence,

                    ...buildTrackingCustomData(tracking),
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

async function getClientTracking({
                                     conversationId,
                                     normalizedPhone,
                                 }: {
    conversationId: string;
    normalizedPhone: string | null;
}): Promise<ClientTracking | null> {
    const { data: conversation } = await supabase
        .from("conversations")
        .select("client_id")
        .eq("id", conversationId)
        .maybeSingle();

    if (conversation?.client_id) {
        const { data } = await supabase
            .from("clients")
            .select(
                `
                id,
                external_contact_id,
                created_at,
                fbclid,
                fbc,
                fbp,
                ctwa_clid,
                gclid,
                gbraid,
                wbraid,
                utm_source,
                utm_medium,
                utm_campaign,
                utm_content,
                utm_term,
                tracking_updated_at
            `
            )
            .eq("id", conversation.client_id)
            .maybeSingle();

        return (data ?? null) as ClientTracking | null;
    }

    if (!normalizedPhone) return null;

    const { data } = await supabase
        .from("clients")
        .select(
            `
            id,
            external_contact_id,
            created_at,
            fbclid,
            fbc,
            fbp,
            ctwa_clid,
            gclid,
            gbraid,
            wbraid,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            tracking_updated_at
        `
        )
        .or(
            [
                `phone.eq.${normalizedPhone}`,
                `phone.eq.+${normalizedPhone}`,
                `phone.eq.${stripBrazilPrefix(normalizedPhone)}`,
            ].join(",")
        )
        .maybeSingle();

    return (data ?? null) as ClientTracking | null;
}

function buildUserData({
                           hashedPhone,
                           hashedEmail,
                           tracking,
                       }: {
    hashedPhone: string | null;
    hashedEmail: string | null;
    tracking: ClientTracking | null;
}) {
    const externalId = tracking
        ? tracking.external_contact_id ?? tracking.id
        : null;

    const fbc =
        tracking?.fbc ??
        buildFbcFromFbclid(
            tracking?.fbclid ?? null,
            tracking?.tracking_updated_at ?? tracking?.created_at ?? null
        );

    return removeNullValues({
        ...(hashedPhone ? { ph: [hashedPhone] } : {}),
        ...(hashedEmail ? { em: [hashedEmail] } : {}),

        ...(externalId ? { external_id: [hash(externalId)] } : {}),

        ...(fbc ? { fbc } : {}),
        ...(tracking?.fbp ? { fbp: tracking.fbp } : {}),
        ...(tracking?.ctwa_clid ? { ctwa_clid: tracking.ctwa_clid } : {}),
    });
}

function buildTrackingCustomData(tracking: ClientTracking | null) {
    if (!tracking) return {};

    return removeNullValues({
        fbclid: tracking.fbclid,

        gclid: tracking.gclid,
        gbraid: tracking.gbraid,
        wbraid: tracking.wbraid,

        utm_source: tracking.utm_source,
        utm_medium: tracking.utm_medium,
        utm_campaign: tracking.utm_campaign,
        utm_content: tracking.utm_content,
        utm_term: tracking.utm_term,
    });
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

function stripBrazilPrefix(phone: string) {
    if (phone.startsWith("55")) {
        return phone.slice(2);
    }

    return phone;
}

function buildFbcFromFbclid(fbclid: string | null, dateValue: string | null) {
    if (!fbclid) return null;

    const timestamp = dateValue
        ? Math.floor(new Date(dateValue).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

    return `fb.1.${timestamp}.${fbclid}`;
}

function removeNullValues<T extends Record<string, unknown>>(object: T) {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => {
            if (value === null || value === undefined || value === "") return false;

            if (Array.isArray(value)) {
                return value.length > 0;
            }

            return true;
        })
    );
}

function toUnixSeconds(date: string) {
    return Math.floor(new Date(date).getTime() / 1000);
}
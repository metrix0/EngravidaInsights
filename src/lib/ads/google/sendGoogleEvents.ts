// src/lib/ads/google/sendGoogleEvents.ts
import crypto from "crypto";

import { supabase } from "@/lib/supabase/client";
import type { DerivedAdEvent } from "@/lib/ads/deriveAdEventsFromAnalysis";

type SendGoogleEventsInput = {
    events: DerivedAdEvent[];
    phone: string | null;
    email?: string | null;
    conversation_id: string;
    conversation_ended_at: string;
};

type ClientTracking = {
    id: string;
    gclid: string | null;
    gbraid: string | null;
    wbraid: string | null;
};

const googleAdsClientId = process.env.GOOGLE_ADS_CLIENT_ID;
const googleAdsClientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
const googleAdsRefreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
const googleAdsDeveloperToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const googleAdsCustomerId = normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
const googleAdsLoginCustomerId = normalizeCustomerId(
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
);

const qualifiedLeadConversionAction =
    process.env.GOOGLE_ADS_CONVERSION_ACTION_QUALIFIED_LEAD;

const bookAppointmentConversionAction =
    process.env.GOOGLE_ADS_CONVERSION_ACTION_BOOK_APPOINTMENT;

export async function sendGoogleEvents({
                                           events,
                                           phone,
                                           email,
                                           conversation_id,
                                           conversation_ended_at,
                                       }: SendGoogleEventsInput) {
    if (events.length === 0) {
        return {
            ok: true,
            skipped: true,
            reason: "No ad events",
        };
    }

    const sentAt = new Date().toISOString();

    const adEventIds = await createPendingGoogleAdEvents({
        events,
        conversation_id,
        sentAt,
    });

    try {
        validateGoogleEnv();

        const normalizedPhone = phone ? normalizeBrazilPhone(phone) : null;

        const hashedPhone = normalizedPhone
            ? hash(`+${normalizedPhone}`)
            : null;

        const hashedEmail = email ? hashEmail(email) : null;

        const tracking = await getClientTracking({
            conversationId: conversation_id,
        });

        const accessToken = await getGoogleAccessToken();

        const conversions = events
            .map((event) =>
                buildClickConversion({
                    event,
                    conversation_id,
                    conversation_ended_at,
                    tracking,
                    hashedEmail,
                    hashedPhone,
                })
            )
            .filter(Boolean);

        if (conversions.length === 0) {
            await updateAdEventsStatus(adEventIds, "failed");

            return {
                ok: false,
                skipped: true,
                reason: "No valid Google conversion identifiers",
            };
        }

        const payload = {
            conversions,
            partialFailure: false,
            validateOnly: false,
        };

        const response = await fetch(
            `https://googleads.googleapis.com/v24/customers/${googleAdsCustomerId}:uploadClickConversions`,
            {
                method: "POST",
                headers: removeNullValues({
                    Authorization: `Bearer ${accessToken}`,
                    "developer-token": googleAdsDeveloperToken,
                    "login-customer-id": googleAdsLoginCustomerId,
                    "Content-Type": "application/json",
                }) as Record<string, string>,
                body: JSON.stringify(payload),
            }
        );

        const json = await response.json();

        if (!response.ok) {
            await updateAdEventsStatus(adEventIds, "failed");
            throw new Error(`Google Ads API error: ${JSON.stringify(json)}`);
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

function buildClickConversion({
                                  event,
                                  conversation_id,
                                  conversation_ended_at,
                                  tracking,
                                  hashedEmail,
                                  hashedPhone,
                              }: {
    event: DerivedAdEvent;
    conversation_id: string;
    conversation_ended_at: string;
    tracking: ClientTracking | null;
    hashedEmail: string | null;
    hashedPhone: string | null;
}) {
    const conversionAction = getConversionActionResourceName(
        event.google_conversion_name
    );

    const clickId = getBestClickId(tracking);

    const userIdentifiers = buildUserIdentifiers({
        hashedEmail,
        hashedPhone,
    });

    if (!clickId && userIdentifiers.length === 0) {
        return null;
    }

    return removeNullValues({
        conversionAction,
        conversionDateTime: toGoogleAdsDateTime(conversation_ended_at),
        orderId: `${conversation_id}:${event.type}`,

        ...clickId,

        ...(userIdentifiers.length > 0 ? { userIdentifiers } : {}),
    });
}

function buildUserIdentifiers({
                                  hashedEmail,
                                  hashedPhone,
                              }: {
    hashedEmail: string | null;
    hashedPhone: string | null;
}) {
    const identifiers = [];

    if (hashedEmail) {
        identifiers.push({
            hashedEmail,
            userIdentifierSource: "FIRST_PARTY",
        });
    }

    if (hashedPhone) {
        identifiers.push({
            hashedPhoneNumber: hashedPhone,
            userIdentifierSource: "FIRST_PARTY",
        });
    }

    return identifiers;
}

function getBestClickId(tracking: ClientTracking | null) {
    if (tracking?.gclid) {
        return {
            gclid: tracking.gclid,
        };
    }

    if (tracking?.gbraid) {
        return {
            gbraid: tracking.gbraid,
        };
    }

    if (tracking?.wbraid) {
        return {
            wbraid: tracking.wbraid,
        };
    }

    return null;
}

async function getClientTracking({
                                     conversationId,
                                 }: {
    conversationId: string;
}): Promise<ClientTracking | null> {
    const { data: conversation } = await supabase
        .from("conversations")
        .select("client_id")
        .eq("id", conversationId)
        .maybeSingle();

    if (!conversation?.client_id) return null;

    const { data } = await supabase
        .from("clients")
        .select(
            `
            id,
            gclid,
            gbraid,
            wbraid
        `
        )
        .eq("id", conversation.client_id)
        .maybeSingle();

    return (data ?? null) as ClientTracking | null;
}

async function getGoogleAccessToken() {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: googleAdsClientId!,
            client_secret: googleAdsClientSecret!,
            refresh_token: googleAdsRefreshToken!,
        }),
    });

    const json = await response.json();

    if (!response.ok) {
        throw new Error(`Google OAuth error: ${JSON.stringify(json)}`);
    }

    return json.access_token as string;
}

async function createPendingGoogleAdEvents({
                                               events,
                                               conversation_id,
                                               sentAt,
                                           }: {
    events: DerivedAdEvent[];
    conversation_id: string;
    sentAt: string;
}) {
    const { data, error } = await supabase
        .from("ad_events")
        .insert(
            events.map((event) => ({
                conversation_id,
                event_type: event.type,
                platform: "Google Ads",
                status: "pending",
                event_date: sentAt,
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

function getConversionActionResourceName(
    conversionName: DerivedAdEvent["google_conversion_name"]
) {
    const value =
        conversionName === "qualified_lead"
            ? qualifiedLeadConversionAction
            : bookAppointmentConversionAction;

    if (!value) {
        throw new Error(`Missing Google Ads conversion action: ${conversionName}`);
    }

    if (value.startsWith("customers/")) {
        return value;
    }

    return `customers/${googleAdsCustomerId}/conversionActions/${value}`;
}

function validateGoogleEnv() {
    const missing = [
        ["GOOGLE_ADS_CLIENT_ID", googleAdsClientId],
        ["GOOGLE_ADS_CLIENT_SECRET", googleAdsClientSecret],
        ["GOOGLE_ADS_REFRESH_TOKEN", googleAdsRefreshToken],
        ["GOOGLE_ADS_DEVELOPER_TOKEN", googleAdsDeveloperToken],
        ["GOOGLE_ADS_CUSTOMER_ID", googleAdsCustomerId],
        [
            "GOOGLE_ADS_CONVERSION_ACTION_QUALIFIED_LEAD",
            qualifiedLeadConversionAction,
        ],
        [
            "GOOGLE_ADS_CONVERSION_ACTION_BOOK_APPOINTMENT",
            bookAppointmentConversionAction,
        ],
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
        throw new Error(
            `Missing Google Ads envs: ${missing
                .map(([key]) => key)
                .join(", ")}`
        );
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

function normalizeCustomerId(value: string | undefined) {
    return value?.replace(/\D/g, "") || undefined;
}

function toGoogleAdsDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return toGoogleAdsDateTime(new Date().toISOString());
    }

    return date.toISOString().replace("T", " ").replace(".000Z", "+00:00");
}

function removeNullValues<T extends Record<string, unknown>>(object: T) {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => {
            if (value === null || value === undefined || value === "") return false;

            return true;
        })
    );
}
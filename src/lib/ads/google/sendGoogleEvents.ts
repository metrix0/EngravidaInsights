// src/lib/ads/google/sendGoogleEvents.ts
import { createHash } from "crypto";
import { supabase } from "@/lib/supabase/client";
import type { DerivedAdEvent } from "@/lib/ads/deriveAdEventsFromAnalysis";

type SendGoogleEventsInput = {
    events: DerivedAdEvent[];
    phone: string | null;
    email?: string | null;
    name?: string | null;
    conversation_id: string;
    conversation_ended_at: string;
};

type ClientTracking = {
    id: string;
    gclid: string | null;
    gbraid: string | null;
    wbraid: string | null;
};

type GoogleAdsAccount = {
    key: "account_1" | "account_2";
    label: string;
    customerId: string;
    qualifiedLeadConversionAction: string;
    bookAppointmentConversionAction: string;
};

const googleAdsClientId = process.env.GOOGLE_ADS_CLIENT_ID;
const googleAdsClientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
const googleAdsRefreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
const googleAdsDeveloperToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

const googleAdsAccounts: GoogleAdsAccount[] = [
    {
        key: "account_1",
        label: "Engravida",
        customerId: normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID)!,
        qualifiedLeadConversionAction:
            process.env.GOOGLE_ADS_CONVERSION_ACTION_QUALIFIED_LEAD!,
        bookAppointmentConversionAction:
            process.env.GOOGLE_ADS_CONVERSION_ACTION_BOOK_APPOINTMENT!,
    },
    ...(process.env.GOOGLE_ADS_CUSTOMER_ID_2
        ? [
            {
                key: "account_2" as const,
                label: "Clínica Engravida",
                customerId: normalizeCustomerId(
                    process.env.GOOGLE_ADS_CUSTOMER_ID_2
                )!,
                qualifiedLeadConversionAction:
                    process.env
                        .GOOGLE_ADS_CONVERSION_ACTION_QUALIFIED_LEAD_2!,
                bookAppointmentConversionAction:
                    process.env
                        .GOOGLE_ADS_CONVERSION_ACTION_BOOK_APPOINTMENT_2!,
            },
        ]
        : []),
];

export async function sendGoogleEvents({
                                           events,
                                           phone,
                                           email,
                                           name,
                                           conversation_id,
                                           conversation_ended_at,
                                       }: SendGoogleEventsInput) {
    console.log("[sendGoogleEvents] started", {
        conversation_id,
        events_count: events.length,
        conversation_ended_at,
        has_phone: Boolean(phone),
        has_email: Boolean(email),
        has_name: Boolean(name),
        accounts_count: googleAdsAccounts.length,
        accounts: googleAdsAccounts.map((account) => ({
            key: account.key,
            label: account.label,
            customer_id: account.customerId,
        })),
    });

    if (events.length === 0) {
        console.log("[sendGoogleEvents] skipped: no ad events", {
            conversation_id,
        });

        return {
            ok: true,
            skipped: true,
            reason: "No ad events",
        };
    }

    const sentAt = new Date().toISOString();

    try {
        validateGoogleEnv();

        const tracking = await getClientTracking({
            conversationId: conversation_id,
        });

        if (!getBestClickId(tracking)) {
            console.log("[sendGoogleEvents] skipped: no Google click id", {
                conversation_id,
                has_gclid: Boolean(tracking?.gclid),
                has_gbraid: Boolean(tracking?.gbraid),
                has_wbraid: Boolean(tracking?.wbraid),
            });

            return {
                ok: true,
                skipped: true,
                reason: "No Google click id",
            };
        }

        const adEventIds = await createPendingGoogleAdEvents({
            events,
            conversation_id,
            sentAt,
        });

        console.log("[sendGoogleEvents] pending ad_events created", {
            conversation_id,
            ad_event_ids: adEventIds,
        });

        console.log("[sendGoogleEvents] client tracking loaded", {
            conversation_id,
            client_id: tracking?.id ?? null,
            has_gclid: Boolean(tracking?.gclid),
            has_gbraid: Boolean(tracking?.gbraid),
            has_wbraid: Boolean(tracking?.wbraid),
            click_id_used: getBestClickIdName(tracking),
        });

        const sentParameters = buildGoogleSentParameters(tracking, {
            phone,
            email,
            name,
        });

        await updateAdEventsParameters(adEventIds, sentParameters);

        console.log("[sendGoogleEvents] ad_event parameters saved", {
            conversation_id,
            ad_event_ids: adEventIds,
            parameters: sentParameters,
        });

        const accessToken = await getGoogleAccessToken();

        console.log("[sendGoogleEvents] google access token generated", {
            conversation_id,
            has_access_token: Boolean(accessToken),
        });

        const results = [];

        for (const account of googleAdsAccounts) {
            console.log(`[sendGoogleEvents][${account.key}] preparing upload`, {
                account_label: account.label,
                customer_id: account.customerId,
                conversation_id,
                events: events.map((event) => ({
                    type: event.type,
                    google_conversion_name: event.google_conversion_name,
                    confidence: event.confidence,
                    occurred_at: event.occurred_at,
                })),
            });

            const conversions = events
                .map((event) =>
                    buildClickConversion({
                        event,
                        conversation_id,
                        conversation_ended_at,
                        tracking,
                        account,
                        phone,
                        email,
                        name,
                    })
                )
                .filter(Boolean);

            console.log(`[sendGoogleEvents][${account.key}] conversions built`, {
                account_label: account.label,
                customer_id: account.customerId,
                conversions_count: conversions.length,
                conversions,
            });

            if (conversions.length === 0) {
                console.log(`[sendGoogleEvents][${account.key}] skipped account`, {
                    account_label: account.label,
                    customer_id: account.customerId,
                    reason: "No valid Google conversion identifiers",
                    has_gclid: Boolean(tracking?.gclid),
                    has_gbraid: Boolean(tracking?.gbraid),
                    has_wbraid: Boolean(tracking?.wbraid),
                });

                results.push({
                    account: account.key,
                    label: account.label,
                    customer_id: account.customerId,
                    ok: false,
                    skipped: true,
                    reason: "No valid Google conversion identifiers",
                });

                continue;
            }

            const payload = {
                conversions,
                partialFailure: true,
                validateOnly: false,
            };

            console.log(`[sendGoogleEvents][${account.key}] sending request`, {
                account_label: account.label,
                customer_id: account.customerId,
                endpoint: `customers/${account.customerId}:uploadClickConversions`,
                payload,
            });

            const response = await fetch(
                `https://googleads.googleapis.com/v24/customers/${account.customerId}:uploadClickConversions`,
                {
                    method: "POST",
                    headers: removeNullValues({
                        Authorization: `Bearer ${accessToken}`,
                        "developer-token": googleAdsDeveloperToken,
                        "Content-Type": "application/json",
                    }) as Record<string, string>,
                    body: JSON.stringify(payload),
                }
            );

            const json = await response.json();

            console.log(`[sendGoogleEvents][${account.key}] response received`, {
                account_label: account.label,
                customer_id: account.customerId,
                http_ok: response.ok,
                http_status: response.status,
                response: json,
            });

            if (json.partialFailureError) {
                console.error(`[sendGoogleEvents][${account.key}] partial failure`, {
                    account_label: account.label,
                    customer_id: account.customerId,
                    payload,
                    response: json,
                });

                results.push({
                    account: account.key,
                    label: account.label,
                    customer_id: account.customerId,
                    ok: false,
                    skipped: false,
                    reason: "Google Ads partial failure",
                    payload,
                    response: json,
                });

                continue;
            }

            if (!response.ok) {
                await updateAdEventsStatus(adEventIds, "failed");

                console.error(`[sendGoogleEvents][${account.key}] API error`, {
                    account_label: account.label,
                    customer_id: account.customerId,
                    status: response.status,
                    payload,
                    response: json,
                });

                throw new Error(
                    `Google Ads API error (${account.label}): ${JSON.stringify(
                        json
                    )}`
                );
            }

            results.push({
                account: account.key,
                label: account.label,
                customer_id: account.customerId,
                ok: true,
                skipped: false,
                payload,
                response: json,
            });

            console.log(`[sendGoogleEvents][${account.key}] upload succeeded`, {
                account_label: account.label,
                customer_id: account.customerId,
                results_count: json.results?.length ?? null,
                job_id: json.jobId ?? null,
            });
        }

        const successfulUploads = results.filter((result) => result.ok);

        if (successfulUploads.length === 0) {
            await updateAdEventsStatus(adEventIds, "failed");

            console.log("[sendGoogleEvents] all accounts skipped/failed", {
                conversation_id,
                results,
            });

            return {
                ok: false,
                skipped: true,
                reason: "No Google account received valid conversions",
                results,
            };
        }

        await updateAdEventsStatus(adEventIds, "sent");

        console.log("[sendGoogleEvents] completed", {
            conversation_id,
            ad_event_ids: adEventIds,
            successful_uploads: successfulUploads.length,
            total_accounts: googleAdsAccounts.length,
            results,
        });

        return {
            ok: true,
            skipped: false,
            results,
        };
    } catch (error) {
        console.error("[sendGoogleEvents] failed", {
            conversation_id,
            error,
        });

        throw error;
    }
}

function buildClickConversion({
                                  event,
                                  conversation_id,
                                  conversation_ended_at,
                                  tracking,
                                  account,
                                  phone,
                                  email,
                                  name,
                              }: {
    event: DerivedAdEvent;
    conversation_id: string;
    conversation_ended_at: string;
    tracking: ClientTracking | null;
    account: GoogleAdsAccount;
    phone: string | null;
    email?: string | null;
    name?: string | null;
}) {
    const conversionAction = getConversionActionResourceName(
        event.google_conversion_name,
        account
    );

    const clickId = getBestClickId(tracking);

    if (!clickId) {
        return null;
    }

    const userIdentifiers = buildUserIdentifiers({ phone, email, name });

    return removeNullValues({
        conversionAction,
        conversionDateTime: toGoogleAdsDateTime(conversation_ended_at),
        orderId: `${conversation_id}:${event.type}`,

        ...clickId,

        ...(userIdentifiers.length > 0 ? { userIdentifiers } : {}),
    });
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

function getBestClickIdName(tracking: ClientTracking | null) {
    if (tracking?.gclid) return "gclid";
    if (tracking?.gbraid) return "gbraid";
    if (tracking?.wbraid) return "wbraid";

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
    conversionName: DerivedAdEvent["google_conversion_name"],
    account: GoogleAdsAccount
) {
    const value =
        conversionName === "qualified_lead"
            ? account.qualifiedLeadConversionAction
            : account.bookAppointmentConversionAction;

    if (!value) {
        throw new Error(
            `Missing Google Ads conversion action for ${account.label}: ${conversionName}`
        );
    }

    if (value.startsWith("customers/")) {
        return value;
    }

    return `customers/${account.customerId}/conversionActions/${value}`;
}

function validateGoogleEnv() {
    const missing = [
        ["GOOGLE_ADS_CLIENT_ID", googleAdsClientId],
        ["GOOGLE_ADS_CLIENT_SECRET", googleAdsClientSecret],
        ["GOOGLE_ADS_REFRESH_TOKEN", googleAdsRefreshToken],
        ["GOOGLE_ADS_DEVELOPER_TOKEN", googleAdsDeveloperToken],
    ].filter(([, value]) => !value);

    for (const account of googleAdsAccounts) {
        if (!account.customerId) {
            missing.push([`${account.key}.customerId`, account.customerId]);
        }

        if (!account.qualifiedLeadConversionAction) {
            missing.push([
                `${account.key}.qualifiedLeadConversionAction`,
                account.qualifiedLeadConversionAction,
            ]);
        }

        if (!account.bookAppointmentConversionAction) {
            missing.push([
                `${account.key}.bookAppointmentConversionAction`,
                account.bookAppointmentConversionAction,
            ]);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing Google Ads envs: ${missing
                .map(([key]) => key)
                .join(", ")}`
        );
    }
}

function normalizeCustomerId(value: string | undefined) {
    return value?.replace(/\D/g, "") || undefined;
}

function toGoogleAdsDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return toGoogleAdsDateTime(new Date().toISOString());
    }

    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const min = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}+00:00`;
}

function removeNullValues<T extends Record<string, unknown>>(object: T) {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => {
            if (value === null || value === undefined || value === "") return false;

            return true;
        })
    );
}

async function updateAdEventsParameters(
    adEventIds: string[],
    parameters: string[]
) {
    if (adEventIds.length === 0) return;

    const { error } = await supabase
        .from("ad_events")
        .update({
            parameters,
            updated_at: new Date().toISOString(),
        })
        .in("id", adEventIds);

    if (error) {
        throw error;
    }
}

function buildGoogleSentParameters(
    tracking: ClientTracking | null,
    {
        phone,
        email,
        name,
    }: {
        phone: string | null;
        email?: string | null;
        name?: string | null;
    }
) {
    return uniqueStrings([
        "conversion_action",
        "conversion_date_time",
        "order_id",
        "partial_failure",
        "validate_only",

        tracking?.gclid ? "gclid" : null,
        tracking?.gbraid ? "gbraid" : null,
        tracking?.wbraid ? "wbraid" : null,

        phone ? "hashed_phone_number" : null,
        email ? "hashed_email" : null,
        name ? "hashed_name" : null,
    ]);
}

function buildUserIdentifiers({
                                  phone,
                                  email,
                                  name,
                              }: {
    phone: string | null;
    email?: string | null;
    name?: string | null;
}) {
    const userIdentifiers: Array<Record<string, unknown>> = [];

    if (email) {
        const hashedEmail = normalizeAndHashEmail(email);

        if (hashedEmail) {
            userIdentifiers.push({
                hashedEmail,
                userIdentifierSource: "FIRST_PARTY",
            });
        }
    }

    if (phone) {
        const normalizedPhone = normalizeBrazilPhoneToE164(phone);

        if (normalizedPhone) {
            userIdentifiers.push({
                hashedPhoneNumber: sha256(normalizedPhone),
                userIdentifierSource: "FIRST_PARTY",
            });
        }
    }

    const splitName = splitFullName(name);

    if (splitName) {
        userIdentifiers.push({
            addressInfo: {
                hashedFirstName: normalizeAndHash(splitName.firstName),
                hashedLastName: normalizeAndHash(splitName.lastName),
            },
            userIdentifierSource: "FIRST_PARTY",
        });
    }

    return userIdentifiers;
}

function splitFullName(name?: string | null) {
    if (!name) return null;

    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length < 2) return null;

    return {
        firstName: parts[0],
        lastName: parts[parts.length - 1],
    };
}

function normalizeAndHashEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const [localPart, domain] = normalized.split("@");

    if (!localPart || !domain) return null;

    if (domain === "gmail.com" || domain === "googlemail.com") {
        return sha256(`${localPart.split("+")[0].replace(/\./g, "")}@${domain}`);
    }

    return sha256(normalized);
}

function normalizeAndHash(value: string) {
    return sha256(value.trim().toLowerCase().replace(/\s+/g, ""));
}

function normalizeBrazilPhoneToE164(phone: string) {
    const digits = phone.replace(/\D/g, "");

    if (!digits) return null;
    if (digits.startsWith("55")) return `+${digits}`;
    if (digits.length === 10 || digits.length === 11) return `+55${digits}`;

    return null;
}

function sha256(value: string) {
    return createHash("sha256").update(value).digest("hex");
}

function uniqueStrings(values: Array<string | null | undefined>) {
    return Array.from(
        new Set(values.filter((value): value is string => Boolean(value)))
    );
}
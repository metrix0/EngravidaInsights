// src/app/api/tintim/route.ts
import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase/client";

type TintimPayload = {
    phone?: string | null;
    phone_e164?: string | null;

    fbclid?: string | null;
    fbc?: string | null;
    fbp?: string | null;

    gclid?: string | null;
    gbraid?: string | null;
    wbraid?: string | null;

    ctwa_clid?: string | null;

    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;

    visit?: {
        params?: {
            fbclid?: string | null;
            fbc?: string | null;
            fbp?: string | null;

            gclid?: string | null;
            gbraid?: string | null;
            wbraid?: string | null;

            ctwa_clid?: string | null;

            utm_source?: string | null;
            utm_medium?: string | null;
            utm_campaign?: string | null;
            utm_content?: string | null;
            utm_term?: string | null;
        } | null;
    } | null;
};

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as TintimPayload;
        void forwardTintimWebhook(payload);

        const normalizedPhone = normalizeBrazilPhone(
            payload.phone_e164 ?? payload.phone ?? null
        );

        if (!normalizedPhone) {
            return NextResponse.json(
                { ok: false, error: "Missing phone" },
                { status: 400 }
            );
        }

        const { data: client, error: findError } = await supabase
            .from("clients")
            .select("*")
            .or(
                [
                    `phone.eq.${normalizedPhone}`,
                    `phone.eq.+${normalizedPhone}`,
                    `phone.eq.${stripBrazilPrefix(normalizedPhone)}`,
                ].join(",")
            )
            .maybeSingle();

        if (findError) {
            return NextResponse.json(
                { ok: false, error: findError.message },
                { status: 500 }
            );
        }

        if (!client) {
            return NextResponse.json({
                ok: true,
                matched: false,
                reason: "Client not found",
                phone: normalizedPhone,
            });
        }

        const tracking = extractTracking(payload);
        const updatePayload = buildOnlyEmptyFieldsUpdate(client, tracking);

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({
                ok: true,
                matched: true,
                client_id: client.id,
                updated_tracking_fields: [],
            });
        }

        const { error: updateError } = await supabase
            .from("clients")
            .update({
                ...updatePayload,
                tracking_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", client.id);

        if (updateError) {
            return NextResponse.json(
                { ok: false, error: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            matched: true,
            client_id: client.id,
            updated_tracking_fields: Object.keys(updatePayload),
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to process Tintim webhook",
            },
            { status: 500 }
        );
    }
}

function extractTracking(payload: TintimPayload) {
    const params = payload.visit?.params ?? {};

    return {
        fbclid: firstValue(payload.fbclid, params.fbclid),
        fbc: firstValue(payload.fbc, params.fbc),
        fbp: firstValue(payload.fbp, params.fbp),

        gclid: firstValue(payload.gclid, params.gclid),
        gbraid: firstValue(payload.gbraid, params.gbraid),
        wbraid: firstValue(payload.wbraid, params.wbraid),

        ctwa_clid: firstValue(payload.ctwa_clid, params.ctwa_clid),

        utm_source: firstValue(payload.utm_source, params.utm_source),
        utm_medium: firstValue(payload.utm_medium, params.utm_medium),
        utm_campaign: firstValue(payload.utm_campaign, params.utm_campaign),
        utm_content: firstValue(payload.utm_content, params.utm_content),
        utm_term: firstValue(payload.utm_term, params.utm_term),
    };
}

function buildOnlyEmptyFieldsUpdate(
    currentClient: Record<string, unknown>,
    incoming: Record<string, string | null>
) {
    const update: Record<string, string> = {};

    for (const [key, value] of Object.entries(incoming)) {
        if (!value) continue;

        const currentValue = currentClient[key];

        if (
            currentValue === null ||
            currentValue === undefined ||
            currentValue === ""
        ) {
            update[key] = value;
        }
    }

    return update;
}

function firstValue(...values: Array<string | null | undefined>) {
    return values.find((value) => value && value.trim() !== "")?.trim() ?? null;
}

function normalizeBrazilPhone(phone: string | null) {
    if (!phone) return null;

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

async function forwardTintimWebhook(payload: TintimPayload) {
    const forwardUrl = process.env.TINTIM_FORWARD_WEBHOOK_URL;

    if (!forwardUrl) return;

    try {
        const response = await fetch(forwardUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.warn("[tintim webhook] Forward failed", {
                status: response.status,
            });
        }
    } catch (error) {
        console.warn("[tintim webhook] Forward error", error);
    }
}
// src/lib/clients/createClient.ts
import { randomUUID } from "crypto";

import { supabase } from "@/lib/supabase/client";
import type { Client } from "@/types/client";
import type { ParsedBlipMessage } from "@/lib/importers/blip/parseBlipMessage";

export async function createClientFromParsedMessage(
    parsedMessage: ParsedBlipMessage
): Promise<Client> {
    if (!parsedMessage.external_contact_id) {
        throw new Error("Cannot create client without external_contact_id");
    }

    const { data: existingClient, error: findError } = await supabase
        .from("clients")
        .select("*")
        .eq("external_contact_id", parsedMessage.external_contact_id)
        .maybeSingle();

    if (findError) {
        throw findError;
    }

    if (existingClient) {
        await updateClientLastInteraction(
            existingClient.id,
            parsedMessage.sent_at
        );

        return {
            ...existingClient,
            last_interaction_at: parsedMessage.sent_at,
        };
    }

    const now = new Date().toISOString();
    const phone = extractPhoneFromExternalContactId(
        parsedMessage.external_contact_id
    );

    const { data: createdClient, error: createError } = await supabase
        .from("clients")
        .insert({
            id: randomUUID(),

            name: null,
            phone,
            email: null,

            external_contact_id: parsedMessage.external_contact_id,

            first_seen_at: parsedMessage.sent_at,
            last_interaction_at: parsedMessage.sent_at,

            created_at: now,
            updated_at: now,
        })
        .select("*")
        .single();

    if (createError) {
        throw createError;
    }

    return createdClient;
}

async function updateClientLastInteraction(
    clientId: string,
    lastInteractionAt: string
) {
    const { error } = await supabase
        .from("clients")
        .update({
            last_interaction_at: lastInteractionAt,
            updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);

    if (error) {
        throw error;
    }
}

function extractPhoneFromExternalContactId(
    externalContactId: string
): string | null {
    const beforeAt = externalContactId.split("@")[0];
    const onlyDigits = beforeAt.replace(/\D/g, "");

    if (onlyDigits.length < 10 || onlyDigits.length > 15) {
        return null;
    }

    return onlyDigits;
}
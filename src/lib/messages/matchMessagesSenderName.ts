// src/lib/messages/matchMessagesSenderName.ts
import { supabase } from "@/lib/supabase/client";
import type { SenderType } from "@/types/message";

type MatchMessagesSenderNameInput = {
    limit: number;
};

type PendingConversation = {
    id: string;
};

type MessageRow = {
    id: string;
    conversation_id: string | null;
    client_id: string;
    sender_type: SenderType;
    sender_name: string | null;
    external_contact_id: string | null;
    external_attendant_id: string | null;
};

type ClientRow = {
    id: string;
    name: string | null;
    external_contact_id: string | null;
};

type AttendantRow = {
    id: string;
    name: string;
    external_attendant_id: string | null;
};

export async function matchMessagesSenderName({
                                                  limit,
                                              }: MatchMessagesSenderNameInput) {
    const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select("id")
        .is("conversation_analysis_id", null)
        .order("ended_at", { ascending: true })
        .limit(limit);

    if (conversationsError) {
        throw conversationsError;
    }

    const pendingConversations = (conversations ?? []) as PendingConversation[];

    if (pendingConversations.length === 0) {
        return {
            updated_messages: 0,
            ready_conversation_ids: [],
            skipped_conversation_ids: [],
        };
    }

    const conversationIds = pendingConversations.map(
        (conversation) => conversation.id
    );

    const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(
            "id, conversation_id, client_id, sender_type, sender_name, external_contact_id, external_attendant_id"
        )
        .in("conversation_id", conversationIds)
        .order("sent_at", { ascending: true });

    if (messagesError) {
        throw messagesError;
    }

    const messages = (messagesData ?? []) as MessageRow[];

    const clientIds = Array.from(
        new Set(messages.map((message) => message.client_id).filter(Boolean))
    );

    const externalContactIds = Array.from(
        new Set(
            messages
                .map((message) => message.external_contact_id)
                .filter(Boolean) as string[]
        )
    );

    const externalAttendantIds = Array.from(
        new Set(
            messages
                .map((message) => message.external_attendant_id)
                .filter(Boolean) as string[]
        )
    );

    const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, external_contact_id")
        .or(
            [
                clientIds.length > 0 ? `id.in.(${clientIds.join(",")})` : null,
                externalContactIds.length > 0
                    ? `external_contact_id.in.(${externalContactIds.join(",")})`
                    : null,
            ]
                .filter(Boolean)
                .join(",")
        );

    if (clientsError) {
        throw clientsError;
    }

    const attendantsQuery =
        externalAttendantIds.length > 0
            ? await supabase
                .from("attendants")
                .select("id, name, external_attendant_id")
                .in("external_attendant_id", externalAttendantIds)
            : { data: [], error: null };

    if (attendantsQuery.error) {
        throw attendantsQuery.error;
    }

    const clients = (clientsData ?? []) as ClientRow[];
    const attendants = (attendantsQuery.data ?? []) as AttendantRow[];

    const clientsById = new Map(clients.map((client) => [client.id, client]));
    const clientsByExternalContactId = new Map(
        clients
            .filter((client) => client.external_contact_id)
            .map((client) => [client.external_contact_id, client])
    );

    const attendantsByExternalId = new Map(
        attendants
            .filter((attendant) => attendant.external_attendant_id)
            .map((attendant) => [attendant.external_attendant_id, attendant])
    );

    const skippedConversationIds = new Set<string>();
    const updates: { id: string; sender_name: string }[] = [];

    for (const message of messages) {
        if (!message.conversation_id) continue;

        const senderName = getSenderNameForMessage({
            message,
            clientsById,
            clientsByExternalContactId,
            attendantsByExternalId,
        });

        if (!senderName) {
            skippedConversationIds.add(message.conversation_id);
            continue;
        }

        if (message.sender_name !== senderName) {
            updates.push({
                id: message.id,
                sender_name: senderName,
            });
        }
    }

    for (const update of updates) {
        const { error } = await supabase
            .from("messages")
            .update({
                sender_name: update.sender_name,
            })
            .eq("id", update.id);

        if (error) {
            throw error;
        }
    }

    await updateConversationAttendantNames({
        messages,
        attendantsByExternalId,
    });

    const readyConversationIds = conversationIds.filter(
        (conversationId) => !skippedConversationIds.has(conversationId)
    );

    return {
        updated_messages: updates.length,
        ready_conversation_ids: readyConversationIds,
        skipped_conversation_ids: Array.from(skippedConversationIds),
    };
}

function getSenderNameForMessage({
                                     message,
                                     clientsById,
                                     clientsByExternalContactId,
                                     attendantsByExternalId,
                                 }: {
    message: MessageRow;
    clientsById: Map<string, ClientRow>;
    clientsByExternalContactId: Map<string | null, ClientRow>;
    attendantsByExternalId: Map<string | null, AttendantRow>;
}) {
    if (message.sender_type === "client") {
        const client =
            clientsById.get(message.client_id) ??
            clientsByExternalContactId.get(message.external_contact_id);

        return client?.name ?? null;
    }

    if (message.sender_type === "attendant") {
        const attendant = attendantsByExternalId.get(
            message.external_attendant_id
        );

        return attendant?.name ?? null;
    }

    if (message.sender_type === "bot") {
        return "Bot";
    }

    if (message.sender_type === "system") {
        return "Sistema";
    }

    return null;
}

async function updateConversationAttendantNames({
                                                    messages,
                                                    attendantsByExternalId,
                                                }: {
    messages: MessageRow[];
    attendantsByExternalId: Map<string | null, AttendantRow>;
}) {
    const attendantNameByConversationId = new Map<string, string>();

    for (const message of messages) {
        if (!message.conversation_id) continue;
        if (message.sender_type !== "attendant") continue;
        if (!message.external_attendant_id) continue;

        const attendant = attendantsByExternalId.get(
            message.external_attendant_id
        );

        if (!attendant?.name) continue;

        if (!attendantNameByConversationId.has(message.conversation_id)) {
            attendantNameByConversationId.set(
                message.conversation_id,
                attendant.name
            );
        }
    }

    for (const [conversationId, attendantName] of attendantNameByConversationId) {
        const { error } = await supabase
            .from("conversations")
            .update({
                attendant_chat_name: attendantName,
            })
            .eq("id", conversationId);

        if (error) {
            throw error;
        }
    }
}
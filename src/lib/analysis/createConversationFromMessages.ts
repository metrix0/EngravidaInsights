// src/lib/analysis/createConversationFromMessages.ts
import type { Conversation, Message } from "@/types";

type CreateConversationInput = {
    id: string;
    client_id: string;
    source: Conversation["source"];
    messages: Message[];
};

export function createConversationFromMessages({
                                                   id,
                                                   client_id,
                                                   source,
                                                   messages,
                                               }: CreateConversationInput): Conversation {
    if (messages.length === 0) {
        throw new Error("Cannot create conversation from empty messages array");
    }

    const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    );

    return {
        id,
        client_id,
        source,

        started_at: sortedMessages[0].sent_at,
        ended_at: sortedMessages[sortedMessages.length - 1].sent_at,

        primary_attendant_name: getPrimaryAttendantName(sortedMessages),

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

function getPrimaryAttendantName(messages: Message[]): string | null {
    const counts = new Map<string, number>();

    for (const message of messages) {
        if (message.sender_type !== "attendant" || !message.sender_name) continue;

        counts.set(message.sender_name, (counts.get(message.sender_name) ?? 0) + 1);
    }

    let primaryName: string | null = null;
    let highestCount = 0;

    for (const [name, count] of counts.entries()) {
        if (count > highestCount) {
            primaryName = name;
            highestCount = count;
        }
    }

    return primaryName;
}
// src/types/conversation.ts
export type ConversationSource =
    | "blip"
    | "whatsapp"
    | "manual_import"
    | "other";

export type Conversation = {
    id: string;
    client_id: string;

    source: ConversationSource;

    started_at: string;
    ended_at: string | null;

    primary_attendant_name: string | null;

    created_at: string;
    updated_at: string;
};
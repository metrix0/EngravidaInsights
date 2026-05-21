// src/types/message.ts
export type SenderType = "client" | "attendant" | "bot" | "system";

export type Message = {
    id: string;

    client_id: string;
    conversation_id: string | null;

    sender_type: SenderType;
    sender_name: string | null;

    text: string;

    sent_at: string;
    sequence_index: number;

    created_at: string;
};
// src/types/client.ts
export type Client = {
    id: string;

    name: string | null;
    phone: string;
    email: string | null;

    external_ids: {
        blip_contact_id?: string;
        whatsapp_id?: string;
        crm_id?: string;
    };

    created_at: string;
    updated_at: string;

    first_seen_at: string;
    last_interaction_at: string;
};
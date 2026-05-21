// src/types/attendant.ts
export type Attendant = {
    id: string;

    name: string;
    email: string | null;

    unit_id: string | null;

    active: boolean;

    created_at: string;
    updated_at: string;
};
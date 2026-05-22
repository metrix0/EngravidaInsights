// src/types/filters.ts
export type FilterOption = {
    label: string;
    value: string;
};

export type FilterEntity = "units" | "attendants" | "services";

export type FiltersResponse = Partial<Record<FilterEntity, FilterOption[]>>;
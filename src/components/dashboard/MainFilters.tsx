// src/components/dashboard/MainFilters.tsx

"use client";

import { BarChart3, MapPin } from "lucide-react";

import { FilterButton } from "@/components";
import type { FilterOption } from "@/types";

type MainFiltersProps = {
    tunnels?: FilterOption[];
    origins?: FilterOption[];

    tunnelValues: string[];
    setTunnelValues: (values: string[]) => void;

    originValues: string[];
    setOriginValues: (values: string[]) => void;
};

export function MainFilters({
                                       tunnels = [],
                                       origins = [],
                                       tunnelValues,
                                       setTunnelValues,
                                       originValues,
                                       setOriginValues,
                                   }: MainFiltersProps) {
    return (
        <>
            <FilterButton
                icon={<BarChart3 size={16} />}
                label="Todos os túneis"
                values={tunnelValues}
                onChange={setTunnelValues}
                options={tunnels}
            />

            <FilterButton
                icon={<MapPin size={16} />}
                label="Todas as origens"
                values={originValues}
                onChange={setOriginValues}
                options={origins}
            />
        </>
    );
}
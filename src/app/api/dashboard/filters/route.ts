// src/app/api/dashboard/filters/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import type { FilterEntity, FiltersResponse } from "@/types";

type DashboardFilterEntity = FilterEntity | "tunnels" | "origins";

const allowedEntities: DashboardFilterEntity[] = [
    "units",
    "attendants",
    "services",
    "tunnels",
    "origins",
];

const NULL_FILTER_VALUE = "__NULL__";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const entitiesParam = searchParams.get("entities");

    const requestedEntities = entitiesParam
        ? entitiesParam
            .split(",")
            .map((entity) => entity.trim())
            .filter((entity): entity is DashboardFilterEntity =>
                allowedEntities.includes(entity as DashboardFilterEntity)
            )
        : allowedEntities;

    const response: FiltersResponse & {
        tunnels?: { label: string; value: string }[];
        origins?: { label: string; value: string }[];
    } = {};

    await Promise.all(
        requestedEntities.map(async (entity) => {
            if (entity === "units") {
                const { data, error } = await supabase
                    .from("units")
                    .select("id, name")
                    .eq("active", true)
                    .order("name");

                if (error) throw error;

                response.units =
                    data?.map((unit) => ({
                        label: unit.name,
                        value: unit.id,
                    })) ?? [];
            }

            if (entity === "attendants") {
                const { data, error } = await supabase
                    .from("attendants")
                    .select("id, name")
                    .eq("active", true)
                    .order("name");

                if (error) throw error;

                response.attendants =
                    data?.map((attendant) => ({
                        label: attendant.name,
                        value: attendant.id,
                    })) ?? [];
            }

            if (entity === "services") {
                const { data, error } = await supabase
                    .from("services")
                    .select("id, name")
                    .eq("active", true)
                    .order("name");

                if (error) throw error;

                response.services =
                    data?.map((service) => ({
                        label: service.name,
                        value: service.id,
                    })) ?? [];
            }

            if (entity === "tunnels") {
                const { data, error } = await supabase
                    .from("conversations")
                    .select("tunnel");

                if (error) throw error;

                response.tunnels = buildNullableTextOptions(
                    (data ?? []).map((item) => item.tunnel)
                );
            }

            if (entity === "origins") {
                const { data, error } = await supabase
                    .from("conversations")
                    .select("origin");

                if (error) throw error;

                response.origins = buildNullableTextOptions(
                    (data ?? []).map((item) => item.origin)
                );
            }
        })
    );

    return NextResponse.json(response);
}

function buildNullableTextOptions(values: Array<string | null>) {
    const hasNull = values.some((value) => !value || !String(value).trim());

    const definedOptions = Array.from(
        new Set(
            values
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
        )
    )
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({
            label: value,
            value,
        }));

    return [
        ...(hasNull
            ? [
                {
                    label: "Não definido",
                    value: NULL_FILTER_VALUE,
                },
            ]
            : []),
        ...definedOptions,
    ];
}

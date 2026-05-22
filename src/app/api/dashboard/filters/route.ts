// src/app/api/dashboard/filters/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import type { FilterEntity, FiltersResponse } from "@/types";

const allowedEntities: FilterEntity[] = ["units", "attendants", "services"];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const entitiesParam = searchParams.get("entities");

    const requestedEntities = entitiesParam
        ? entitiesParam
            .split(",")
            .map((entity) => entity.trim())
            .filter((entity): entity is FilterEntity =>
                allowedEntities.includes(entity as FilterEntity)
            )
        : allowedEntities;

    const response: FiltersResponse = {};

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
        })
    );

    return NextResponse.json(response);
}


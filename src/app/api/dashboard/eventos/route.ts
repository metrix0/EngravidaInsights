// src/app/api/dashboard/eventos/route.ts
import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase/client";
import {
    AD_EVENT_STATUS_LABELS,
    AD_EVENT_STATUSES,
    AD_EVENT_TYPE_LABELS,
    AD_EVENT_TYPES,
    AD_PLATFORMS,
    type AdEventStatus,
    type AdEventType,
    type AdPlatform,
} from "@/types/ad-event";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const days = Number(searchParams.get("days") ?? 7);

    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const unitIds = splitParam(searchParams.get("unit_ids"));
    const serviceIds = splitParam(searchParams.get("service_ids"));

    const platforms = splitParam(searchParams.get("platforms")) as AdPlatform[];
    const eventTypes = splitParam(searchParams.get("event_types")) as AdEventType[];
    const statuses = splitParam(searchParams.get("statuses")) as AdEventStatus[];

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("page_size") ?? 50);

    const currentRange = getDateRange({
        days,
        startDate,
        endDate,
    });

    const previousRange = getPreviousDateRange(currentRange);

    const currentEvents = await getEvents({
        dateRange: currentRange,
        unitIds,
        serviceIds,
        platforms,
        eventTypes,
        statuses,
    });

    const previousEvents = await getEvents({
        dateRange: previousRange,
        unitIds,
        serviceIds,
        platforms,
        eventTypes,
        statuses,
    });

    const groupedRecentEvents = groupRecentEvents(currentEvents);

    const recentStart = (page - 1) * pageSize;
    const recentEnd = recentStart + pageSize;
    const recentEvents = groupedRecentEvents.slice(recentStart, recentEnd);

    return NextResponse.json({
        kpis: buildKpis(currentEvents),
        previous_kpis: buildKpis(previousEvents),

        by_platform: buildByPlatform(currentEvents),
        previous_by_platform: buildByPlatform(previousEvents),

        by_type: buildByType(currentEvents),
        previous_by_type: buildByType(previousEvents),

        by_status: buildByStatus(currentEvents),

        daily: buildDailyEvents(currentEvents, currentRange.start, currentRange.end),

        recent: recentEvents.map((event) => ({
            id: event.id,
            conversation_id: event.conversation_id,
            date: event.event_date,
            client_name: event.client_name,
            phone: event.phone,
            event_type: event.event_type,
            platform: event.platform,
            platforms: event.platforms,
            status: event.status,
        })),

        recent_total: groupedRecentEvents.length,
        page,
        page_size: pageSize,
    });
}

type DateRange = {
    start: string;
    end: string;
};

type GetEventsInput = {
    dateRange: DateRange;
    unitIds: string[];
    serviceIds: string[];
    platforms: AdPlatform[];
    eventTypes: AdEventType[];
    statuses: AdEventStatus[];
};

async function getEvents({
                             dateRange,
                             unitIds,
                             serviceIds,
                             platforms,
                             eventTypes,
                             statuses,
                         }: GetEventsInput) {
    let query = supabase
        .from("ad_events")
        .select(
            `
            id,
            conversation_id,
            event_type,
            platform,
            status,
            event_date,
            conversations!inner (
                id,
                unit_id,
                service_id,
                clients (
                    id,
                    name,
                    phone
                )
            )
        `
        )
        .gte("event_date", dateRange.start)
        .lte("event_date", dateRange.end)
        .order("event_date", { ascending: false });

    if (platforms.length > 0) {
        query = query.in("platform", platforms);
    }

    if (eventTypes.length > 0) {
        query = query.in("event_type", eventTypes);
    }

    if (statuses.length > 0) {
        query = query.in("status", statuses);
    }

    if (unitIds.length > 0) {
        query = query.in("conversations.unit_id", unitIds);
    }

    if (serviceIds.length > 0) {
        query = query.in("conversations.service_id", serviceIds);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as any[];
}

function groupRecentEvents(events: any[]) {
    const grouped = new Map<string, any>();

    for (const event of events) {
        const key = [
            event.conversation_id,
            event.event_type,
            event.status,
            event.event_date,
        ].join("|");

        const existing = grouped.get(key);

        if (!existing) {
            grouped.set(key, {
                id: event.id,
                conversation_id: event.conversation_id,
                event_type: event.event_type,
                status: event.status,
                event_date: event.event_date,
                platform: event.platform,
                platforms: [event.platform],
                client_name: event.conversations?.clients?.name ?? "Sem nome",
                phone: event.conversations?.clients?.phone ?? "",
            });

            continue;
        }

        if (!existing.platforms.includes(event.platform)) {
            existing.platforms.push(event.platform);
        }

        existing.platform = existing.platforms.join(" + ");
    }

    return Array.from(grouped.values()).sort(
        (a, b) =>
            new Date(b.event_date).getTime() -
            new Date(a.event_date).getTime()
    );
}

function buildKpis(events: any[]) {
    const totalEvents = events.length;
    const sentEvents = events.filter((event) => event.status === "sent").length;
    const failedEvents = events.filter((event) => event.status === "failed").length;

    return {
        total_events: totalEvents,
        sent_events: sentEvents,
        failed_events: failedEvents,
    };
}

function buildByPlatform(events: any[]) {
    const totalEvents = events.length;

    return AD_PLATFORMS.map((platform) => {
        const count = events.filter((event) => event.platform === platform).length;

        return {
            platform,
            count,
            percentage: percentage(count, totalEvents),
        };
    });
}

function buildByType(events: any[]) {
    const totalEvents = events.length;

    return AD_EVENT_TYPES.map((eventType) => {
        const count = events.filter(
            (event) => event.event_type === eventType
        ).length;

        return {
            event_type: eventType,
            label: AD_EVENT_TYPE_LABELS[eventType],
            count,
            percentage: percentage(count, totalEvents),
        };
    });
}

function buildByStatus(events: any[]) {
    const totalEvents = events.length;

    return AD_EVENT_STATUSES.map((status) => {
        const count = events.filter((event) => event.status === status).length;

        return {
            status,
            label: AD_EVENT_STATUS_LABELS[status],
            count,
            percentage: percentage(count, totalEvents),
        };
    });
}

function splitParam(value: string | null) {
    if (!value) return [];

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function getDateRange({
                          days,
                          startDate,
                          endDate,
                      }: {
    days: number;
    startDate: string | null;
    endDate: string | null;
}): DateRange {
    if (startDate) {
        return {
            start: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
            end: new Date(`${endDate ?? startDate}T23:59:59.999Z`).toISOString(),
        };
    }

    const end = new Date();

    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
}

function getPreviousDateRange(currentRange: DateRange): DateRange {
    const currentStart = new Date(currentRange.start);
    const currentEnd = new Date(currentRange.end);

    const durationMs = currentEnd.getTime() - currentStart.getTime();

    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    return {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
    };
}

function percentage(value: number, total: number) {
    if (total === 0) return 0;

    return Math.round((value / total) * 1000) / 10;
}

function buildDailyEvents(events: any[], startValue: string, endValue: string) {
    const start = new Date(startValue);
    const end = new Date(endValue);

    const days: Record<string, string | number>[] = [];

    const cursor = new Date(start);

    while (cursor <= end) {
        const dateKey = cursor.toISOString().slice(0, 10);

        const item: Record<string, string | number> = {
            date: formatShortDate(cursor),
        };

        for (const platform of AD_PLATFORMS) {
            for (const eventType of AD_EVENT_TYPES) {
                const key = getDailyKey(platform, eventType);

                item[key] = events.filter((event) => {
                    const eventDate = new Date(event.event_date)
                        .toISOString()
                        .slice(0, 10);

                    return (
                        eventDate === dateKey &&
                        event.platform === platform &&
                        event.event_type === eventType
                    );
                }).length;
            }
        }

        days.push(item);

        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
}

function getDailyKey(platform: string, eventType: string) {
    return `${slug(platform)}_${eventType}`;
}

function slug(value: string) {
    return value
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
}

function formatShortDate(date: Date) {
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
    });
}
// src/app/eventos/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2, ChevronLeft,
    ChevronRight,
    HelpCircle,
    MapPin,
    MessageCircleMore,
    Send,
    UsersRound,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { FaGoogle, FaMeta } from "react-icons/fa6";

import type { FiltersResponse } from "@/types";
import {
    AD_EVENT_STATUS_LABELS,
    AD_EVENT_STATUSES,
    AD_EVENT_TYPE_LABELS,
    AD_EVENT_TYPES,
    AD_PLATFORM_LABELS,
    AD_PLATFORMS,
    type AdEventStatus,
    type AdEventType,
    type AdPlatform,
} from "@/types/ad-event";

import {
    ButtonGroup,
    CalendarButton,
    Card,
    FilterButton,
    HorizontalScroller,
    InfoTooltip,
    KpiCard,
    SidePanel,
    Skeleton,
} from "@/components";

import AdvancedFilterButton from "@/components/ui/AdvancedFilterButton";
import {ConversationPanel} from "@/components/conversations/ConversationPanel";

type Period = "7" | "30" | "90";

type DateRange = {
    start: string | null;
    end: string | null;
};

type EventsDashboardData = {
    kpis: {
        total_events: number;
        sent_events: number;
        failed_events: number;
    };
    previous_kpis: {
        total_events: number;
        sent_events: number;
        failed_events: number;
    };
    by_platform: {
        platform: AdPlatform;
        count: number;
        percentage: number;
    }[];
    previous_by_platform: {
        platform: AdPlatform;
        count: number;
        percentage: number;
    }[];
    by_type: {
        event_type: AdEventType;
        label: string;
        count: number;
        percentage: number;
    }[];
    previous_by_type: {
        event_type: AdEventType;
        label: string;
        count: number;
        percentage: number;
    }[];
    by_status: {
        status: AdEventStatus;
        count: number;
        percentage: number;
    }[];
    daily: Record<string, string | number>[];
    recent: {
        id: string;
        conversation_id: string | null;
        date: string;
        client_name: string;
        phone: string;
        event_type: AdEventType;
        platform: AdPlatform;
        status: AdEventStatus;
    }[];
    recent_total: number;
    page: number;
    page_size: number;
};

const PAGE_SIZE = 20;

const DAILY_EVENT_COLORS: Record<string, string> = {
    meta_ads_lead: "#2563eb",
    meta_ads_schedule: "#639aeb",
    google_ads_lead: "#E29229",
    google_ads_schedule: "#e0a569",
};

const EVENT_TYPE_CHART_COLORS: Record<AdEventType, string> = {
    lead: "#8b5cf6",
    schedule: "#e83e8c",
};

const STATUS_CHART_COLORS: Record<AdEventStatus, string> = {
    sent: "#0fbb73",
    failed: "#e43535",
};

export default function EventsPage() {
    const [filters, setFilters] = useState<FiltersResponse | null>(null);
    const [data, setData] = useState<EventsDashboardData | null>(null);

    const [unitIds, setUnitIds] = useState<string[]>([]);
    const [serviceIds, setServiceIds] = useState<string[]>([]);

    const [eventValues, setEventValues] = useState<string[]>([]);
    const [platformValues, setPlatformValues] = useState<string[]>([]);
    const [statusValues, setStatusValues] = useState<string[]>([]);

    const [period, setPeriod] = useState<Period | null>("7");
    const [selectedRange, setSelectedRange] = useState<DateRange>({
        start: null,
        end: null,
    });

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
        null
    );

    const [currentPage, setCurrentPage] = useState(1);

    const [loadingFilters, setLoadingFilters] = useState(true);
    const [loadingData, setLoadingData] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        unitIds,
        serviceIds,
        platformValues,
        eventValues,
        statusValues,
        period,
        selectedRange,
    ]);

    useEffect(() => {
        async function loadFilters() {
            try {
                const response = await fetch(
                    "/api/dashboard/filters?entities=units,services"
                );
                const json: FiltersResponse = await response.json();

                setFilters(json);
            } finally {
                setLoadingFilters(false);
            }
        }

        loadFilters();
    }, []);

    useEffect(() => {
        async function loadData() {
            if (data) {
                setIsRefreshing(true);
            } else {
                setLoadingData(true);
            }

            const params = new URLSearchParams();

            params.set("page", String(currentPage));
            params.set("page_size", String(PAGE_SIZE));

            if (selectedRange.start) {
                params.set("start_date", selectedRange.start);
                params.set("end_date", selectedRange.end ?? selectedRange.start);
            } else {
                params.set("days", period ?? "7");
            }

            if (unitIds.length > 0) {
                params.set("unit_ids", unitIds.join(","));
            }

            if (serviceIds.length > 0) {
                params.set("service_ids", serviceIds.join(","));
            }

            if (platformValues.length > 0) {
                params.set("platforms", platformValues.join(","));
            }

            if (eventValues.length > 0) {
                params.set("event_types", eventValues.join(","));
            }

            if (statusValues.length > 0) {
                params.set("statuses", statusValues.join(","));
            }

            try {
                const response = await fetch(
                    `/api/dashboard/eventos?${params.toString()}`
                );
                const json: EventsDashboardData = await response.json();

                setData(json);
            } finally {
                setLoadingData(false);
                setIsRefreshing(false);
            }
        }

        loadData();
    }, [
        currentPage,
        unitIds,
        serviceIds,
        platformValues,
        eventValues,
        statusValues,
        period,
        selectedRange,
    ]);

    if (loadingFilters || loadingData) {
        return (
            <main className="flex h-screen w-screen overflow-y-scroll bg-white text-slate-900">
                <SidePanel />

                <section className="flex-1 px-8 py-8">
                    <EventsSkeleton />
                </section>
            </main>
        );
    }

    if (!data) {
        return (
            <main className="flex h-screen w-screen overflow-y-scroll bg-white text-slate-900">
                <SidePanel />

                <section className="flex-1 px-8 py-8">
                    Nenhum dado encontrado.
                </section>
            </main>
        );
    }

    return (
        <main className="flex h-screen w-screen overflow-y-scroll bg-white text-slate-900">
            <SidePanel />

            <section className="flex-1 px-8 py-8">
                <Header
                    period={period}
                    setPeriod={setPeriod}
                    selectedRange={selectedRange}
                    setSelectedRange={setSelectedRange}
                />

                <div className="mb-8 flex justify-end gap-3">
                    <FilterButton
                        icon={<MapPin size={16} />}
                        label="Todas as unidades"
                        values={unitIds}
                        onChange={setUnitIds}
                        options={filters?.units ?? []}
                    />

                    <FilterButton
                        icon={<BarChart3 size={16} />}
                        label="Todos os serviços"
                        values={serviceIds}
                        onChange={setServiceIds}
                        options={filters?.services ?? []}
                    />

                    <AdvancedFilterButton
                        sections={[
                            {
                                id: "event",
                                title: "Evento",
                                values: eventValues,
                                onChange: setEventValues,
                                options: AD_EVENT_TYPES.map((eventType) => ({
                                    label: AD_EVENT_TYPE_LABELS[eventType],
                                    value: eventType,
                                })),
                            },
                            {
                                id: "platform",
                                title: "Plataforma",
                                values: platformValues,
                                onChange: setPlatformValues,
                                options: AD_PLATFORMS.map((platform) => ({
                                    label: AD_PLATFORM_LABELS[platform],
                                    value: platform,
                                })),
                            },
                            {
                                id: "status",
                                title: "Status",
                                values: statusValues,
                                onChange: setStatusValues,
                                options: AD_EVENT_STATUSES.map((status) => ({
                                    label: AD_EVENT_STATUS_LABELS[status],
                                    value: status,
                                })),
                            },
                        ]}
                    />
                </div>

                {isRefreshing ? (
                    <EventsBodySkeleton />
                ) : (
                    <div className="overflow-x-hidden pb-12">
                        <KpiSection data={data} />

                        <section className="mb-6 grid grid-cols-[1.8fr_0.8fr_0.8fr] gap-5">
                            <EventsByDayCard data={data} />
                            <EventsByTypeCard data={data} />
                            <SendStatusCard data={data} />
                        </section>

                        <RecentEventsCard
                            data={data}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                            onSelectConversation={setSelectedConversationId}
                        />
                    </div>
                )}
            </section>
            <ConversationPanel
                conversationId={selectedConversationId}
                onClose={() => setSelectedConversationId(null)}
            />
        </main>
    );
}

function Header({
                    period,
                    setPeriod,
                    selectedRange,
                    setSelectedRange,
                }: {
    period: Period | null;
    setPeriod: (value: Period | null) => void;
    selectedRange: DateRange;
    setSelectedRange: (value: DateRange) => void;
}) {
    return (
        <header className="mb-8 flex items-start justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Eventos
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Acompanhe os eventos enviados para as plataformas de anúncios
                </p>
            </div>

            <ButtonGroup
                value={period}
                onChange={(value) => {
                    setPeriod(value);
                    setSelectedRange({
                        start: null,
                        end: null,
                    });
                }}
                options={[
                    { value: "7", label: "7 dias" },
                    { value: "30", label: "30 dias" },
                    { value: "90", label: "90 dias" },
                ]}
            >
                <CalendarButton
                    value={selectedRange}
                    onChange={setSelectedRange}
                    onApply={(range) => {
                        if (range.start) {
                            setPeriod(null);
                            return;
                        }

                        setPeriod("7");
                    }}
                />
            </ButtonGroup>
        </header>
    );
}

function KpiSection({ data }: { data: EventsDashboardData }) {
    const platformKpis = AD_PLATFORMS.map((platform) => {
        const item = data.by_platform.find(
            (platformItem) => platformItem.platform === platform
        );

        return {
            platform,
            value: item?.count ?? 0,
        };
    });

    return (
        <section className="mb-6 grid grid-cols-1 gap-5">
            <HorizontalScroller scrollAmount={400}>
                <div className="min-w-[260px]">
                    <KpiCard
                        icon={<Send size={26} />}
                        label="Eventos enviados"
                        currentValue={data.kpis.total_events}
                        previousValue={data.previous_kpis.total_events}
                        formatter={(value) => value.toLocaleString("pt-BR")}
                        color="purple"
                    />
                </div>

                {platformKpis.map((item) => (
                    <div key={item.platform} className="min-w-[260px]">
                        <KpiCard
                            icon={<PlatformIcon platform={item.platform} />}
                            label={AD_PLATFORM_LABELS[item.platform]}
                            currentValue={item.value}
                            previousValue={getPreviousPlatformCount(
                                data,
                                item.platform
                            )}
                            formatter={(value) => value.toLocaleString("pt-BR")}
                            color={item.platform === "Google Ads" ? "orange" : "blue"}
                        />
                    </div>
                ))}

                <div className="min-w-[260px]">
                    <KpiCard
                        icon={<UsersRound size={26} />}
                        label="Qualified Lead"
                        currentValue={getTypeCount(data, "lead")}
                        previousValue={getPreviousTypeCount(data, "lead")}
                        formatter={(value) => value.toLocaleString("pt-BR")}
                        color="green"
                    />
                </div>

                <div className="min-w-[260px]">
                    <KpiCard
                        icon={<Calendar size={26} />}
                        label="Schedule"
                        currentValue={getTypeCount(data, "schedule")}
                        previousValue={getPreviousTypeCount(data, "schedule")}
                        formatter={(value) => value.toLocaleString("pt-BR")}
                        color="purple"
                    />
                </div>

                <div className="min-w-[260px]">
                    <KpiCard
                        icon={<AlertTriangle size={26} />}
                        label="Falhas"
                        currentValue={data.kpis.failed_events}
                        previousValue={data.previous_kpis.failed_events}
                        formatter={(value) => value.toLocaleString("pt-BR")}
                        color="orange"
                        positiveDirection="down"
                    />
                </div>
            </HorizontalScroller>
        </section>
    );
}

function EventsByDayCard({ data }: { data: EventsDashboardData }) {
    const bars = AD_PLATFORMS.flatMap((platform) =>
        AD_EVENT_TYPES.map((eventType) => {
            const key = getDailyKey(platform, eventType);

            return {
                key,
                platform,
                eventType,
                eventLabel: AD_EVENT_TYPE_LABELS[eventType],
                color: DAILY_EVENT_COLORS[key] ?? "#64748b",
            };
        })
    );

    return (
        <Card>
            <div className="mb-5">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                        Eventos enviados por dia
                    </h2>

                    <InfoTooltip text="Mostra a quantidade de eventos enviados por plataforma e tipo de evento.">
                        <HelpCircle size={16} className="text-slate-400" />
                    </InfoTooltip>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    {bars.map((bar) => (
                        <LegendDot
                            key={bar.key}
                            color={bar.color}
                            platform={bar.platform}
                            label={bar.eventLabel}
                        />
                    ))}
                </div>
            </div>

            <div className="h-[285px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.daily} barCategoryGap="22%">
                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />

                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            stroke="#94a3b8"
                        />

                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />

                        <Tooltip
                            content={<EventsByDayTooltip bars={bars} />}
                            cursor={false}
                        />

                        {bars.map((bar) => (
                            <Bar
                                key={bar.key}
                                dataKey={bar.key}
                                stackId="events"
                                fill={bar.color}
                                radius={[0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function EventsByTypeCard({ data }: { data: EventsDashboardData }) {
    return (
        <Card>
            <div className="mb-5 flex items-center gap-2">
                <h2 className="text-lg font-bold">Eventos por tipo</h2>

                <InfoTooltip text="Distribuição dos eventos derivados das análises.">
                    <HelpCircle size={16} className="text-slate-400" />
                </InfoTooltip>
            </div>

            <div className="relative h-[215px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data.by_type}
                            dataKey="count"
                            nameKey="label"
                            innerRadius={58}
                            outerRadius={86}
                            paddingAngle={0}
                        >
                            {data.by_type.map((item) => (
                                <Cell
                                    key={item.event_type}
                                    fill={EVENT_TYPE_CHART_COLORS[item.event_type]}
                                />
                            ))}
                        </Pie>

                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-slate-900">
                        {data.kpis.total_events}
                    </div>
                    <div className="text-xs text-slate-500">Total</div>
                </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
                {data.by_type.map((item) => (
                    <ChartLegendRow
                        key={item.event_type}
                        color={EVENT_TYPE_CHART_COLORS[item.event_type]}
                        label={item.label}
                        value={`${item.count} (${item.percentage}%)`}
                    />
                ))}
            </div>
        </Card>
    );
}

function SendStatusCard({ data }: { data: EventsDashboardData }) {
    return (
        <Card>
            <div className="mb-5 flex items-center gap-2">
                <h2 className="text-lg font-bold">Status de envio</h2>

                <InfoTooltip text="Mostra quantos eventos foram enviados ou falharam.">
                    <HelpCircle size={16} className="text-slate-400" />
                </InfoTooltip>
            </div>

            <div className="relative h-[215px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data.by_status}
                            dataKey="count"
                            nameKey="status"
                            innerRadius={58}
                            outerRadius={86}
                        >
                            {data.by_status.map((item) => (
                                <Cell
                                    key={item.status}
                                    fill={STATUS_CHART_COLORS[item.status]}
                                />
                            ))}
                        </Pie>

                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-slate-900">
                        {data.kpis.total_events}
                    </div>
                    <div className="text-xs text-slate-500">Total</div>
                </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
                {data.by_status.map((item) => (
                    <ChartLegendRow
                        key={item.status}
                        color={STATUS_CHART_COLORS[item.status]}
                        label={AD_EVENT_STATUS_LABELS[item.status]}
                        value={`${item.count} (${item.percentage}%)`}
                    />
                ))}
            </div>
        </Card>
    );
}

function RecentEventsCard({
                              data,
                              currentPage,
                              onPageChange,
                              onSelectConversation,
                          }: {
    data: EventsDashboardData;
    currentPage: number;
    onPageChange: (page: number) => void;
    onSelectConversation: (conversationId: string) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(data.recent_total / PAGE_SIZE));

    const firstItem =
        data.recent_total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

    const lastItem = Math.min(currentPage * PAGE_SIZE, data.recent_total);

    return (
        <Card>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Eventos recentes</h2>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100">
                <div className="grid grid-cols-[1fr_1.15fr_1fr_1fr_1fr_0.9fr_0.4fr] bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                    <div>Data/Hora</div>
                    <div>Cliente</div>
                    <div>Telefone</div>
                    <div>Evento</div>
                    <div>Plataforma</div>
                    <div>Status</div>
                    <div>Conversa</div>
                </div>

                {data.recent.map((event) => (
                    <div
                        key={event.id}
                        className="grid grid-cols-[1fr_1.15fr_1fr_1fr_1fr_0.9fr_0.4fr] items-center border-t border-slate-100 px-4 py-4 text-sm"
                    >
                        <div
                            title={formatDateTime(event.date)}
                            className="truncate text-slate-600"
                        >
                            {formatDateTime(event.date)}
                        </div>

                        <div
                            title={event.client_name}
                            className="truncate font-medium text-slate-700"
                        >
                            {event.client_name}
                        </div>

                        <div title={event.phone} className="truncate text-slate-600">
                            {formatPhone(event.phone)}
                        </div>

                        <div>
                            <EventTypeBadge eventType={event.event_type} />
                        </div>

                        <div>
                            <PlatformBadge platform={event.platform} />
                        </div>

                        <div>
                            <EventStatusBadge status={event.status} />
                        </div>

                        <button
                            type="button"
                            disabled={!event.conversation_id}
                            onClick={() => {
                                if (!event.conversation_id) return;

                                onSelectConversation(event.conversation_id);
                            }}
                            className="flex w-full cursor-pointer items-center justify-center font-bold text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <MessageCircleMore size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-5">
                <div className="text-sm text-slate-500">
                    Mostrando {firstItem} a {lastItem} de{" "}
                    {data.recent_total} eventos
                </div>

                <Pagination
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={onPageChange}
                />

                <button
                    type="button"
                    className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-4 text-sm text-slate-500"
                >
                    {PAGE_SIZE} por página
                </button>
            </div>
        </Card>
    );
}

function EventTypeBadge({ eventType }: { eventType: AdEventType }) {
    const isSchedule = eventType === "schedule";

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold ${
                isSchedule ? "bg-pink-soft text-pink" : "bg-purple-soft text-purple"
            }`}
        >
            {AD_EVENT_TYPE_LABELS[eventType]}
        </span>
    );
}

function PlatformBadge({ platform }: { platform: AdPlatform | string }) {
    const platforms = platform
        .split(" + ")
        .sort((b,a ) => a.localeCompare(b)) as AdPlatform[];

    return (
        <span className="inline-flex items-center gap-1.5">
            {platforms.map((singlePlatform) => {
                const isMeta = singlePlatform === "Meta Ads";

                return (
                    <span
                        key={singlePlatform}
                        className={`inline-flex items-center rounded-full px-2 py-1.5 text-xs font-bold ${
                            isMeta
                                ? "bg-blue-100/70 text-blue-600"
                                : "bg-amber-100/40 text-amber-600"
                        }`}
                    >
                        <PlatformIconTiny platform={singlePlatform} />
                    </span>
                );
            })}
        </span>
    );
}

function EventStatusBadge({ status }: { status: AdEventStatus }) {
    const isSent = status === "sent";

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold ${
                isSent ? "bg-green-soft text-green" : "bg-red-soft text-red"
            }`}
        >
            {AD_EVENT_STATUS_LABELS[status]}
        </span>
    );
}

function LegendDot({
                       color,
                       platform,
                       label,
                   }: {
    color: string;
    platform: AdPlatform;
    label: string;
}) {
    return (
        <div className="flex items-center gap-1.5">

            <span style={{ color }}>
                <PlatformIconTiny platform={platform} />
            </span>

            <span>{label}</span>
        </div>
    );
}



function ChartLegendRow({
                            color,
                            label,
                            value,
                        }: {
    color: string;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                />
                <span className="text-slate-600">{label}</span>
            </div>

            <span className="font-semibold text-slate-700">{value}</span>
        </div>
    );
}

function EventsByDayTooltip({
                                active,
                                payload,
                                label,
                                bars,
                            }: {
    active?: boolean;
    payload?: any[];
    label?: string;
    bars: {
        key: string;
        platform: AdPlatform;
        eventLabel: string;
        color: string;
    }[];
}) {
    if (!active || !payload?.length) return null;

    const barMap = new Map(bars.map((bar) => [bar.key, bar]));

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <div className="mb-3 text-sm font-semibold text-slate-800">
                {label}
            </div>

            <div className="space-y-2 text-sm">
                {payload.map((item) => {
                    const bar = barMap.get(item.dataKey);

                    return (
                        <div
                            key={item.dataKey}
                            className="flex items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-2">


                                {bar ? (
                                    <span                                     style={{
                                        color: bar?.color ?? "#94a3b8",
                                    }}>                                    <PlatformIconTiny platform={bar.platform} />
                                    </span>

                                ) : null}

                                <span
                                    style={{
                                        color: bar?.color ?? "#475569",
                                    }}
                                >
                                    {bar?.eventLabel ?? item.dataKey}
                                </span>
                            </div>

                            <span
                                className="font-semibold"
                                style={{
                                    color: bar?.color ?? "#334155",
                                }}
                            >
                                {item.value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PlatformIcon({ platform }: { platform: AdPlatform }) {
    if (platform === "Meta Ads") {
        return <FaMeta size={26} className="text-blue-600" />;
    }

    if (platform === "Google Ads") {
        return <FaGoogle size={24} className="text-amber-600" />;
    }

    return <BarChart3 size={26} />;
}

function PlatformIconTiny({ platform }: { platform: AdPlatform }) {
    if (platform === "Meta Ads") {
        return <FaMeta size={14} />;
    }

    if (platform === "Google Ads") {
        return <FaGoogle size={12} />;
    }

    return <BarChart3 size={14} />;
}

function getTypeCount(data: EventsDashboardData, eventType: AdEventType) {
    return (
        data.by_type.find((item) => item.event_type === eventType)?.count ?? 0
    );
}

function getPreviousTypeCount(data: EventsDashboardData, eventType: AdEventType) {
    return (
        data.previous_by_type.find((item) => item.event_type === eventType)
            ?.count ?? 0
    );
}

function getPreviousPlatformCount(
    data: EventsDashboardData,
    platform: AdPlatform
) {
    return (
        data.previous_by_platform.find((item) => item.platform === platform)
            ?.count ?? 0
    );
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

function formatDateTime(value: string) {
    return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPhone(phone: string) {
    return phone.split("+55")[1] ?? phone;
}

function EventsSkeleton() {
    return (
        <>
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <Skeleton className="h-9 w-[180px]" />
                    <Skeleton className="mt-3 h-4 w-[430px]" />
                </div>

                <Skeleton className="h-12 w-[310px]" />
            </div>

            <div className="mb-8 flex justify-end gap-3">
                <Skeleton className="h-12 w-[220px]" />
                <Skeleton className="h-12 w-[220px]" />
                <Skeleton className="h-12 w-[140px]" />
            </div>

            <EventsBodySkeleton />
        </>
    );
}

function EventsBodySkeleton() {
    return (
        <>
            <section className="mb-6 grid grid-cols-1 gap-5">
                <HorizontalScroller scrollAmount={400}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="min-w-[260px]">
                            <Card>
                                <div className="flex items-center gap-5 overflow-hidden">
                                    <Skeleton className="h-14 w-14 shrink-0 rounded-full" />

                                    <div className="min-w-0 flex-1">
                                        <Skeleton className="h-3 w-[65%]" />
                                        <Skeleton className="mt-3 h-8 w-[45%]" />
                                        <Skeleton className="mt-3 h-3 w-[75%]" />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                </HorizontalScroller>
            </section>

            <section className="mb-6 grid grid-cols-[1.8fr_0.8fr_0.8fr] gap-5">
                <Card>
                    <Skeleton className="mb-6 h-6 w-[40%]" />
                    <Skeleton className="h-[285px] w-full" />
                </Card>

                <Card>
                    <Skeleton className="mb-6 h-6 w-[60%]" />
                    <Skeleton className="h-[215px] w-full" />
                </Card>

                <Card>
                    <Skeleton className="mb-6 h-6 w-[55%]" />
                    <Skeleton className="h-[215px] w-full" />
                </Card>
            </section>

            <Card>
                <Skeleton className="mb-5 h-6 w-[180px]" />

                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-full" />
                    ))}
                </div>
            </Card>
        </>
    );
}

function Pagination({
                        totalPages,
                        currentPage,
                        onPageChange,
                    }: {
    totalPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}) {
    const pages = getPaginationPages(totalPages, currentPage);

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ChevronLeft size={18} />
            </button>

            {pages.map((page, index) =>
                page === "..." ? (
                    <div
                        key={`ellipsis-${index}`}
                        className="flex h-10 w-10 items-center justify-center text-slate-500"
                    >
                        ...
                    </div>
                ) : (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onPageChange(page)}
                        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                            page === currentPage
                                ? "bg-purple-soft text-purple"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                        {page}
                    </button>
                )
            )}

            <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}

type PaginationPage = number | "...";

function getPaginationPages(
    totalPages: number,
    currentPage: number
): PaginationPage[] {
    if (totalPages <= 1) return [1];

    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
        return [1, 2, 3, "...", totalPages];
    }

    if (currentPage >= totalPages - 2) {
        return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", currentPage, "...", totalPages];
}
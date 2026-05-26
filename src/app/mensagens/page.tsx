// src/app/mensagens/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    MapPin,
    User,
    CircleAlert,
} from "lucide-react";
import { ConversationPanel } from "@/components/conversations/ConversationPanel";

import type { FiltersResponse } from "@/types";

import {
    ButtonGroup,
    CalendarButton,
    FilterButton,
    SidePanel,
    Skeleton,
} from "@/components";

import { InitialsAvatar } from "@/components/conversations/InitialsAvatar";
import {
    ConversationResultBadge,
    type ConversationResult,
} from "@/components/conversations/ConversationResultBadge";
import { SearchFilter } from "@/components/conversations/SearchFilter";
import AdvancedFilterButton from "@/components/ui/AdvancedFilterButton";

type Period = "7" | "30" | "90";

type DateRange = {
    start: string | null;
    end: string | null;
};

type ConversationRow = {
    id: string;

    attendant_name: string;
    phone: string;
    started_at: string;
    ended_at: string | null;

    client_name: string;
    objective: string;
    result: ConversationResult;
    notable: boolean;
};

type ConversationsResponse = {
    items: ConversationRow[];
    total: number;
    page: number;
    page_size: number;
};

const PAGE_SIZE = 50;

export default function MessagesPage() {
    const [filters, setFilters] = useState<FiltersResponse | null>(null);

    const [unitIds, setUnitIds] = useState<string[]>([]);
    const [attendantIds, setAttendantIds] = useState<string[]>([]);
    const [serviceIds, setServiceIds] = useState<string[]>([]);

    const [goalValues, setGoalValues] = useState<string[]>([]);
    const [resultValues, setResultValues] = useState<string[]>([]);
    const [notableValues, setNotableValues] = useState<string[]>([]);

    const [period, setPeriod] = useState<Period | null>("7");
    const [selectedRange, setSelectedRange] = useState<DateRange>({
        start: null,
        end: null,
    });
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
        null
    );

    const [search, setSearch] = useState("");

    const [conversations, setConversations] = useState<ConversationRow[]>([]);
    const [totalConversations, setTotalConversations] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    const [loadingFilters, setLoadingFilters] = useState(true);
    const [loadingConversations, setLoadingConversations] = useState(true);

    useEffect(() => {
        async function loadFilters() {
            try {
                const response = await fetch(
                    "/api/dashboard/filters?entities=units,attendants,services"
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
        setCurrentPage(1);
    }, [
        period,
        selectedRange,
        search,
        unitIds,
        attendantIds,
        serviceIds,
        goalValues,
        resultValues,
        notableValues,
    ]);

    useEffect(() => {
        async function loadConversations() {
            setLoadingConversations(true);

            const params = new URLSearchParams();

            params.set("page", String(currentPage));
            params.set("page_size", String(PAGE_SIZE));

            if (selectedRange.start) {
                params.set("start_date", selectedRange.start);
                params.set("end_date", selectedRange.end ?? selectedRange.start);
            } else {
                params.set("days", period ?? "7");
            }

            if (search.trim()) {
                params.set("search", search.trim());
            }

            if (unitIds.length > 0) {
                params.set("unit_ids", unitIds.join(","));
            }

            if (attendantIds.length > 0) {
                params.set("attendant_ids", attendantIds.join(","));
            }

            if (serviceIds.length > 0) {
                params.set("service_ids", serviceIds.join(","));
            }

            if (goalValues.length > 0) {
                params.set("conversation_goals", goalValues.join(","));
            }

            if (resultValues.length > 0) {
                params.set("results", resultValues.join(","));
            }

            if (notableValues.length > 0) {
                params.set("notable", notableValues[0]);
            }

            try {
                const response = await fetch(
                    `/api/dashboard/mensagens?${params.toString()}`
                );
                const json: ConversationsResponse = await response.json();

                setConversations(json.items ?? []);
                setTotalConversations(json.total ?? 0);
            } finally {
                setLoadingConversations(false);
            }
        }

        loadConversations();
    }, [
        currentPage,
        period,
        selectedRange,
        search,
        unitIds,
        attendantIds,
        serviceIds,
        goalValues,
        resultValues,
        notableValues,
    ]);

    const totalPages = Math.max(1, Math.ceil(totalConversations / PAGE_SIZE));

    const firstItem =
        totalConversations === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

    const lastItem = Math.min(currentPage * PAGE_SIZE, totalConversations);

    if (loadingFilters && loadingConversations) {
        return (
            <main className="flex h-screen w-screen overflow-y-scroll bg-white text-slate-900">
                <SidePanel />

                <section className="flex-1 px-8 py-8">
                    <MessagesSkeleton />
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
                        icon={<User size={16} />}
                        label="Todos os atendentes"
                        values={attendantIds}
                        onChange={setAttendantIds}
                        options={filters?.attendants ?? []}
                    />

                    <FilterButton
                        icon={<BarChart3 size={16} />}
                        label="Todos os serviços"
                        values={serviceIds}
                        onChange={setServiceIds}
                        options={filters?.services ?? []}
                    />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <h2 className="text-lg font-bold">
                        Conversas{" "}
                        <span className="text-slate-500">
                            ({totalConversations})
                        </span>
                    </h2>

                    <div className="flex items-center gap-3">
                        <SearchFilter value={search} onChange={setSearch} />

                        <AdvancedFilterButton
                            sections={[
                                {
                                    id: "goal",
                                    title: "Objetivo",
                                    values: goalValues,
                                    onChange: setGoalValues,
                                    options: [
                                        { label: "Informação", value: "answer_information" },
                                        { label: "Agendar consulta", value: "schedule_consultation" },
                                        { label: "Reagendar", value: "reschedule_consultation" },
                                        { label: "Confirmar presença", value: "confirm_attendance" },
                                        { label: "Explicar tratamento", value: "explain_treatment" },
                                        { label: "Objeção de preço", value: "handle_price_objection" },
                                        { label: "Outro", value: "other" },
                                    ],
                                },
                                {
                                    id: "result",
                                    title: "Resultado",
                                    values: resultValues,
                                    onChange: setResultValues,
                                    options: [
                                        { label: "Resolvida", value: "resolvida" },
                                        { label: "Parcial", value: "parcial" },
                                        { label: "Não resolvida", value: "nao_resolvida" },
                                        { label: "Pendente", value: "pendente" },
                                    ],
                                },
                                {
                                    id: "notable",
                                    title: "Notável",
                                    values: notableValues,
                                    onChange: setNotableValues,
                                    multi: false,
                                    options: [
                                        { label: "Notáveis", value: "true" },
                                        { label: "Não notáveis", value: "false" },
                                    ],
                                },
                            ]}
                        />
                    </div>
                </div>

                {loadingConversations ? (
                    <MessagesTableSkeleton />
                ) : (
                    <ConversationTable
                        conversations={conversations}
                        onSelectConversation={setSelectedConversationId}
                    />
                )}

                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-5">
                    <div className="text-sm text-slate-500">
                        Mostrando {firstItem} a {lastItem} de{" "}
                        {totalConversations} conversas
                    </div>

                    <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />

                    <button
                        type="button"
                        className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-4 text-sm text-slate-500"
                    >
                        50 por página
                    </button>
                </div>
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
                    Mensagens
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Visualize e explore todas as conversas com seus clientes
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

function ConversationTable({
                               conversations,
                               onSelectConversation,
                           }: {
    conversations: ConversationRow[];
    onSelectConversation: (conversationId: string) => void;
}) {
    return (
        <div className="overflow-hidden">
            <div className="grid grid-cols-[1.35fr_1fr_1.85fr_1.35fr_1.35fr_1fr_48px_48px] border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-500">
                <div>Atendente</div>
                <div>Telefone</div>
                <div>Data</div>
                <div>Cliente</div>
                <div>Objetivo</div>
                <div>Resultado</div>
                <div>Notável</div>
                <div />
            </div>

            {conversations.map((conversation) => (
                <button
                    key={conversation.id}
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className="group grid w-full cursor-pointer grid-cols-[1.35fr_1fr_1.85fr_1.35fr_1.35fr_1fr_48px_48px] items-center border-b border-slate-100 px-6 py-4 text-left text-sm transition-colors hover:bg-selection/80"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <InitialsAvatar name={conversation.attendant_name} />

                        <span
                            title={conversation.attendant_name}
                            className="truncate font-medium text-slate-700"
                        >
                            {conversation.attendant_name}
                        </span>
                    </div>

                    <div
                        title={formatPhone(conversation.phone)}
                        className="truncate text-slate-600"
                    >
                        {formatPhone(conversation.phone)}
                    </div>

                    <DateRangeCell
                        start={conversation.started_at}
                        end={conversation.ended_at}
                    />

                    <div
                        title={conversation.client_name}
                        className="truncate text-slate-700"
                    >
                        {conversation.client_name}
                    </div>

                    <div
                        title={conversation.objective}
                        className="truncate text-slate-700"
                    >
                        {conversation.objective}
                    </div>

                    <div>
                        <ConversationResultBadge result={conversation.result} />
                    </div>

                    <div>
                        <NotableBadge notable={conversation.notable} />
                    </div>

                    <div className="flex justify-end">
                        <ChevronRight
                            size={18}
                            className="text-slate-400 transition-colors group-hover:text-slate-700"
                        />
                    </div>
                </button>
            ))}
        </div>
    );
}

function formatPhone(phone: string) {
    return phone.split("+55")[1] ?? phone;
}

function DateRangeCell({
                           start,
                           end,
                       }: {
    start: string;
    end: string | null;
}) {
    const label = formatConversationDateRange(start, end);

    return (
        <div title={label} className="truncate text-slate-600">
            {label}
        </div>
    );
}

function formatConversationDateRange(startValue: string, endValue: string | null) {
    const start = new Date(startValue);
    const end = endValue ? new Date(endValue) : null;

    if (!end) {
        return formatDate(start);
    }

    const sameDay = start.toDateString() === end.toDateString();

    if (sameDay) {
        return `${formatDate(start)} ${formatTime(start)} às ${formatTime(end)}`;
    }

    return `de ${formatDate(start)} a ${formatDate(end)}`;
}

function formatDate(date: Date) {
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatTime(date: Date) {
    return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function NotableBadge({ notable }: { notable: boolean }) {
    if (!notable) {
        return <span className="ml-2 text-sm text-slate-400"></span>;
    }

    return (
        <span className="inline-flex w-full justify-center font-bold text-slate-500">
            <CircleAlert className="h-4 w-4" />
        </span>
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

function MessagesSkeleton() {
    return (
        <>
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <Skeleton className="h-9 w-[220px]" />
                    <Skeleton className="mt-3 h-4 w-[360px]" />
                </div>

                <Skeleton className="h-12 w-[310px]" />
            </div>

            <div className="mb-8 flex justify-end gap-3">
                <Skeleton className="h-12 w-[220px]" />
                <Skeleton className="h-12 w-[220px]" />
                <Skeleton className="h-12 w-[220px]" />
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <Skeleton className="h-6 w-[150px]" />

                <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-[310px]" />
                    <Skeleton className="h-11 w-[120px]" />
                </div>
            </div>

            <MessagesTableSkeleton />

            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-5">
                <Skeleton className="h-4 w-[230px]" />
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-11 w-[130px]" />
            </div>
        </>
    );
}

function MessagesTableSkeleton() {
    return (
        <div className="overflow-hidden">
            <div className="grid grid-cols-[1.35fr_1fr_1.55fr_1.35fr_1.35fr_1fr_0.7fr_48px] border-b border-slate-100 bg-slate-50 px-6 py-3">
                {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-3 w-[70%]" />
                ))}
            </div>

            {Array.from({ length: 8 }).map((_, rowIndex) => (
                <div
                    key={rowIndex}
                    className="grid grid-cols-[1.35fr_1fr_1.55fr_1.35fr_1.35fr_1fr_0.7fr_48px] items-center border-b border-slate-100 px-6 py-4"
                >
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-[90px]" />
                    </div>

                    <Skeleton className="h-4 w-[105px]" />
                    <Skeleton className="h-4 w-[170px]" />
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-6 w-[86px]" />
                    <Skeleton className="h-6 w-[42px]" />

                    <div className="flex justify-end">
                        <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}
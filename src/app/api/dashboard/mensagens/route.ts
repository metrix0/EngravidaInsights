// src/app/api/dashboard/mensagens/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

type ConversationResult = "resolvida" | "parcial" | "nao_resolvida" | "pendente";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("page_size") ?? 50);

    const days = Number(searchParams.get("days") ?? 7);
    const customStartDate = searchParams.get("start_date");
    const customEndDate = searchParams.get("end_date");

    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";

    const unitIds = parseIds(searchParams.get("unit_ids"));
    const serviceIds = parseIds(searchParams.get("service_ids"));
    const attendantIds = parseIds(searchParams.get("attendant_ids"));

    const dateRange = getDateRange({
        days,
        customStartDate,
        customEndDate,
    });

    let conversationsQuery = supabase
        .from("conversations")
        .select("*")
        .gte("started_at", dateRange.start.toISOString())
        .lte("started_at", dateRange.end.toISOString())
        .order("started_at", { ascending: false })
        .limit(5000);

    if (unitIds.length > 0) {
        conversationsQuery = conversationsQuery.in("unit_id", unitIds);
    }

    if (serviceIds.length > 0) {
        conversationsQuery = conversationsQuery.in("service_id", serviceIds);
    }

    if (attendantIds.length > 0) {
        conversationsQuery = conversationsQuery.in("attendant_id", attendantIds);
    }

    const { data: conversationsData, error: conversationsError } =
        await conversationsQuery;

    if (conversationsError) {
        return NextResponse.json(
            { error: conversationsError.message },
            { status: 500 }
        );
    }

    const conversations = conversationsData ?? [];

    if (conversations.length === 0) {
        return NextResponse.json({
            items: [],
            total: 0,
            page,
            page_size: pageSize,
        });
    }

    const clientIds = Array.from(
        new Set(conversations.map((item) => item.client_id).filter(Boolean))
    );

    const analysisIds = Array.from(
        new Set(
            conversations
                .map((item) => item.conversation_analysis_id)
                .filter(Boolean)
        )
    );

    const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .in("id", clientIds);

    if (clientsError) {
        return NextResponse.json(
            { error: clientsError.message },
            { status: 500 }
        );
    }

    const { data: analysesData, error: analysesError } =
        analysisIds.length > 0
            ? await supabase
                .from("conversation_analysis")
                .select("*")
                .in("id", analysisIds)
            : { data: [], error: null };

    if (analysesError) {
        return NextResponse.json(
            { error: analysesError.message },
            { status: 500 }
        );
    }

    const clientsById = new Map(
        (clientsData ?? []).map((client) => [client.id, client])
    );

    const analysesById = new Map(
        (analysesData ?? []).map((analysis) => [analysis.id, analysis])
    );

    const rows = conversations.map((conversation) => {
        const client = clientsById.get(conversation.client_id);
        const analysis = conversation.conversation_analysis_id
            ? analysesById.get(conversation.conversation_analysis_id)
            : null;

        const clientName = client?.name ?? "Cliente sem nome";
        const phone = client?.phone ?? "-";
        const attendantName =
            conversation.attendant_chat_name ?? "Sem atendente";

        return {
            id: conversation.id,

            attendant_name: attendantName,
            phone,
            started_at: conversation.started_at,
            ended_at: conversation.ended_at,

            client_name: clientName,
            objective: analysis
                ? getGoalLabel(analysis.conversation_goal)
                : "Sem análise",

            result: getConversationResult(analysis?.resolution_result),
            notable: Boolean(analysis?.notable),
        };
    });

    const filteredRows = search
        ? rows.filter((row) => {
            return (
                row.attendant_name.toLowerCase().includes(search) ||
                row.phone.toLowerCase().includes(search) ||
                row.client_name.toLowerCase().includes(search) ||
                row.objective.toLowerCase().includes(search)
            );
        })
        : rows;

    const total = filteredRows.length;

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return NextResponse.json({
        items: filteredRows.slice(startIndex, endIndex),
        total,
        page,
        page_size: pageSize,
    });
}

function getConversationResult(value: string | null | undefined): ConversationResult {
    if (value === "resolved") return "resolvida";
    if (value === "partial") return "parcial";
    if (value === "not_resolved") return "nao_resolvida";

    return "pendente";
}

function getGoalLabel(goal: string): string {
    const labels: Record<string, string> = {
        answer_information: "Informação",
        schedule_consultation: "Agendar consulta",
        reschedule_consultation: "Reagendar",
        confirm_attendance: "Confirmar presença",
        recover_inactive_lead: "Recuperar lead",
        explain_treatment: "Explicar tratamento",
        handle_price_objection: "Objeção de preço",
        collect_documents_or_exams: "Documentos/exames",
        post_consultation_followup: "Pós-consulta",
        other: "Outro",
    };

    return labels[goal] ?? goal;
}

function parseIds(value: string | null): string[] {
    if (!value) return [];

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function getDateRange({
                          days,
                          customStartDate,
                          customEndDate,
                      }: {
    days: number;
    customStartDate: string | null;
    customEndDate: string | null;
}) {
    if (customStartDate) {
        const start = new Date(`${customStartDate}T00:00:00.000`);
        const end = new Date(`${customEndDate ?? customStartDate}T23:59:59.999`);

        return { start, end };
    }

    const end = new Date();
    const start = new Date();

    start.setDate(start.getDate() - days);

    return { start, end };
}
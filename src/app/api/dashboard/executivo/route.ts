// src/app/api/dashboard/executivo/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import type { ExecutiveDashboardData } from "@/types";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const days = Number(searchParams.get("days") ?? 7);
    const unitIds = parseIds(searchParams.get("unit_ids"));
    const serviceIds = parseIds(searchParams.get("service_ids"));
    const attendantIds = parseIds(searchParams.get("attendant_ids"));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
        .from("conversation_analysis")
        .select(`
      *,
      units (
        id,
        name
      ),
      services (
        id,
        name
      ),
      attendants (
        id,
        name
      )
    `)
        .gte("started_at", startDate.toISOString());

    if (unitIds.length > 0) {
        query = query.in("unit_id", unitIds);
    }

    if (serviceIds.length > 0) {
        query = query.in("service_id", serviceIds);
    }

    if (attendantIds.length > 0) {
        query = query.in("attendant_id", attendantIds);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const analyses = data ?? [];

    const response: ExecutiveDashboardData = {
        filters: {
            days,
            unit_ids: unitIds,
            service_ids: serviceIds,
            attendant_ids: attendantIds,
        },

        kpis: buildKpis(analyses),

        daily_evolution: buildDailyEvolution(analyses),

        attendance_score: buildAttendanceScore(analyses),

        dropoff_moments: buildDropoffMoments(analyses),

        conversation_goals: buildConversationGoals(analyses),

        by_unit: buildByUnit(analyses),

    };

    return NextResponse.json(response);
}

function buildKpis(analyses: any[]) {
    const total = analyses.length;

    const resolved = analyses.filter(
        (item) => item.resolution_result === "resolved"
    ).length;

    const satisfied = analyses.filter(
        (item) => item.satisfaction_score >= 70
    ).length;

    const scheduled = analyses.filter((item) =>
        ["scheduled", "rescheduled", "confirmed_attendance"].includes(
            item.customer_final_state
        )
    ).length;

    return {
        conversations_analyzed: total,
        real_resolution_rate: percentage(resolved, total),
        clear_satisfaction_rate: percentage(satisfied, total),
        scheduling_rate: percentage(scheduled, total),
        average_first_human_response_seconds: average(
            analyses
                .map((item) => item.first_human_response_time_seconds)
                .filter((value): value is number => typeof value === "number")
        ),
    };
}

function buildDailyEvolution(analyses: any[]) {
    const map = new Map<
        string,
        {
            date: string;
            total: number;
            resolved: number;
            satisfied: number;
        }
    >();

    for (const item of analyses) {
        const date = formatDateKey(item.started_at);

        const current =
            map.get(date) ??
            {
                date,
                total: 0,
                resolved: 0,
                satisfied: 0,
            };

        current.total += 1;

        if (item.resolution_result === "resolved") current.resolved += 1;
        if (item.satisfaction_score >= 70) current.satisfied += 1;

        map.set(date, current);
    }

    return Array.from(map.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => ({
            date: item.date,
            conversations: item.total,
            resolution_rate: percentage(item.resolved, item.total),
            satisfaction_rate: percentage(item.satisfied, item.total),
        }));
}

function buildAttendanceScore(analyses: any[]) {
    const kpis = buildKpis(analyses);

    const attendantQualityScore =
        average(
            analyses
                .map((item) => item.attendant_quality_score)
                .filter((value): value is number => typeof value === "number")
        ) ?? 0;

    const responseSpeedScore =
        average(
            analyses
                .map((item) => item.response_speed_score)
                .filter((value): value is number => typeof value === "number")
        ) ?? 0;

    const overallScore = average([
        kpis.real_resolution_rate,
        kpis.clear_satisfaction_rate,
        kpis.scheduling_rate,
        responseSpeedScore,
        attendantQualityScore,
    ]) ?? 0;

    return {
        overall_score: overallScore,
        resolution_score: kpis.real_resolution_rate,
        satisfaction_score: kpis.clear_satisfaction_rate,
        response_speed_score: responseSpeedScore,
        attendant_quality_score: attendantQualityScore,
    };
}

function buildDropoffMoments(analyses: any[]) {
    const dropoffs = analyses.filter(
        (item) => item.dropoff_happened && item.dropoff_moment
    );

    const grouped = groupBy(dropoffs, "dropoff_moment");

    return Object.entries(grouped)
        .map(([moment, count]) => ({
            moment,
            label: getDropoffLabel(moment),
            count,
            percentage: percentage(count, dropoffs.length),
        }))
        .sort((a, b) => b.count - a.count);
}

function buildConversationGoals(analyses: any[]) {
    const grouped = groupBy(analyses, "conversation_goal");

    return Object.entries(grouped)
        .map(([goal, count]) => ({
            goal,
            label: getGoalLabel(goal),
            count,
            percentage: percentage(count, analyses.length),
        }))
        .sort((a, b) => b.count - a.count);
}

function buildByUnit(analyses: any[]) {
    const map = new Map<
        string,
        {
            unit_id: string | null;
            unit_name: string;
            total: number;
            resolved: number;
            satisfied: number;
            scheduled: number;
        }
    >();

    for (const item of analyses) {
        const unitId = item.unit_id ?? "unknown";
        const unitName = item.units?.name ?? "Sem unidade";

        const current =
            map.get(unitId) ??
            {
                unit_id: item.unit_id,
                unit_name: unitName,
                total: 0,
                resolved: 0,
                satisfied: 0,
                scheduled: 0,
            };

        current.total += 1;

        if (item.resolution_result === "resolved") current.resolved += 1;
        if (item.satisfaction_score >= 70) current.satisfied += 1;

        if (
            ["scheduled", "rescheduled", "confirmed_attendance"].includes(
                item.customer_final_state
            )
        ) {
            current.scheduled += 1;
        }

        map.set(unitId, current);
    }

    return Array.from(map.values()).map((unit) => ({
        unit_id: unit.unit_id,
        unit_name: unit.unit_name,
        conversations: unit.total,
        resolution_rate: percentage(unit.resolved, unit.total),
        satisfaction_rate: percentage(unit.satisfied, unit.total),
        scheduling_rate: percentage(unit.scheduled, unit.total),
    }));
}


function percentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

function average(values: number[]): number | null {
    if (values.length === 0) return null;

    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
}

function groupBy(items: any[], key: string): Record<string, number> {
    return items.reduce<Record<string, number>>((acc, item) => {
        const value = item[key];

        if (!value) return acc;

        acc[value] = (acc[value] ?? 0) + 1;

        return acc;
    }, {});
}

function formatDateKey(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
    }).format(new Date(value));
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

function getDropoffLabel(moment: string): string {
    const labels: Record<string, string> = {
        after_price: "Após preço",
        after_consultation_online: "Após apresentação da consulta online",
        after_unit_presented: "Após unidade apresentada",
        after_schedule_options: "Após opções de agendamento",
        after_payment_info: "Após informação de pagamento",
        after_medical_question: "Após pergunta médica",
        after_delay: "Após demora no atendimento",
        unknown: "Desconhecido",
    };

    return labels[moment] ?? moment;
}

function getDropoffRecommendation(moment: string): string {
    const recommendations: Record<string, string> = {
        after_price:
            "Reforçar valor percebido antes de apresentar preço e reduzir fricção na explicação.",
        after_consultation_online:
            "Apresentar a consulta online como triagem inicial com valor menor.",
        after_schedule_options:
            "Simplificar as opções de horário e sugerir diretamente os melhores próximos horários.",
        after_medical_question:
            "Criar resposta padrão com acolhimento e encaminhamento claro para avaliação médica.",
        after_delay:
            "Reduzir tempo de primeira resposta humana nos horários de pico.",
    };

    return recommendations[moment] ?? "Revisar conversas afetadas para identificar o padrão de perda.";
}

function parseIds(value: string | null): string[] {
    if (!value) return [];

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}
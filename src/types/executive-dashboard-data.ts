// src/types/executive-dashboard-data.ts
export type ExecutiveDashboardData = {
    filters: {
        days: number;
        unit_id: string | null;
        service_id: string | null;
        attendant_id: string | null;
    };

    kpis: {
        conversations_analyzed: number;

        real_resolution_rate: number;
        clear_satisfaction_rate: number;
        scheduling_rate: number;

        average_first_human_response_seconds: number | null;
    };

    daily_evolution: {
        date: string;
        conversations: number;
        resolution_rate: number;
        satisfaction_rate: number;
    }[];

    attendance_score: {
        overall_score: number;
        resolution_score: number;
        satisfaction_score: number;
        response_speed_score: number;
        attendant_quality_score: number;
    };

    dropoff_moments: {
        moment: string;
        label: string;
        count: number;
        percentage: number;
    }[];

    conversation_goals: {
        goal: string;
        label: string;
        count: number;
        percentage: number;
    }[];

    by_unit: {
        unit_id: string | null;
        unit_name: string;
        conversations: number;
        resolution_rate: number;
        satisfaction_rate: number;
        scheduling_rate: number;
    }[];

};
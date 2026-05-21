// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
    BarChart3,
    Calendar,
    Clock,
    FileText,
    HelpCircle,
    LayoutDashboard,
    MapPin,
    MessageCircle,
    RefreshCcw,
    ShieldCheck,
    Smile,
    User,
    Users,
} from "lucide-react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Line,
} from "recharts";
import type { ExecutiveDashboardData } from "@/types";

export default function ExecutiveDashboardPage() {
    const [data, setData] = useState<ExecutiveDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDashboard() {
            const response = await fetch("/api/dashboard/executivo?days=7");
            const json: ExecutiveDashboardData = await response.json();

            setData(json);
            setLoading(false);
        }

        loadDashboard();
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-[#f7f9fc] p-8 text-slate-900">
                Carregando dashboard...
            </main>
        );
    }

    if (!data) {
        return (
            <main className="min-h-screen bg-[#f7f9fc] p-8 text-slate-900">
                Nenhum dado encontrado.
            </main>
        );
    }

    const averageResponseMinutes =
        data.kpis.average_first_human_response_seconds === null
            ? null
            : Math.round(data.kpis.average_first_human_response_seconds / 60);

    return (
        <main className="w-screen h-screen bg-white mx-auto flex overflow-y-scroll text-slate-900">
                <Sidebar />

                <section className="flex-1 px-8 py-8">
                    <Header />

                    <div className="mb-8 flex justify-end gap-3">
                        <FilterButton icon={<MapPin size={16} />} label="Todas as unidades" />
                        <FilterButton icon={<User size={16} />} label="Todos os atendentes" />
                        <FilterButton icon={<BarChart3 size={16} />} label="Todos os serviços" />
                    </div>

                    <section className="mb-6 grid grid-cols-5 gap-5">
                        <KpiCard
                            icon={<MessageCircle size={26} />}
                            label="Conversas analisadas"
                            value={data.kpis.conversations_analyzed.toLocaleString("pt-BR")}
                            trend="↑ 15,2% vs. 7 dias anteriores"
                        />

                        <KpiCard
                            icon={<ShieldCheck size={26} />}
                            label="Resolução real"
                            value={`${data.kpis.real_resolution_rate}%`}
                            trend="↑ 6,4% vs. 7 dias anteriores"
                        />

                        <KpiCard
                            icon={<Smile size={26} />}
                            label="Clientes claramente satisfeitos"
                            value={`${data.kpis.clear_satisfaction_rate}%`}
                            trend="↑ 4,1% vs. 7 dias anteriores"
                        />

                        <KpiCard
                            icon={<Calendar size={26} />}
                            label="Taxa de agendamento"
                            value={`${data.kpis.scheduling_rate}%`}
                            trend="↑ 8,7% vs. 7 dias anteriores"
                        />

                        <KpiCard
                            icon={<Clock size={26} />}
                            label="1ª resposta humana média"
                            value={averageResponseMinutes === null ? "-" : `${averageResponseMinutes} min`}
                            trend="↓ -6% vs. 7 dias anteriores"
                        />
                    </section>

                    <section className="mb-6 grid grid-cols-[1.45fr_0.95fr] gap-5">
                        <Card>
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold">Evolução diária</h2>

                                    <div className="mt-3 flex items-center gap-6 text-xs text-slate-500">
                                        <LegendDot color="bg-blue-500" label="Conversas" />
                                        <LegendDot color="bg-violet-500" label="Resolução (%)" />
                                        <LegendDot color="bg-emerald-500" label="Satisfação (%)" />
                                    </div>
                                </div>

                                <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                                    Últimos 7 dias
                                </button>
                            </div>

                            <div className="h-[290px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.daily_evolution}>
                                        <defs>
                                            <linearGradient id="conversationFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.22} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                        <Tooltip />

                                        <Area
                                            type="monotone"
                                            dataKey="conversations"
                                            stroke="#1683ff"
                                            strokeWidth={3}
                                            fill="url(#conversationFill)"
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="resolution_rate"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="satisfaction_rate"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <ScoreCard data={data} />
                    </section>

                    <section className="grid grid-cols-3 gap-5">
                        <DropoffCard data={data} />
                        <ConversationGoalsCard data={data} />
                        <UnitViewCard data={data} />
                    </section>
                </section>
        </main>
    );
}

function Sidebar() {
    const items = [
        { label: "Dashboard", icon: <LayoutDashboard size={18} /> },
        { label: "Conversas", icon: <MessageCircle size={18} /> },
        { label: "Jornada", icon: <ShieldCheck size={18} /> },
        { label: "Atendentes", icon: <Users size={18} /> },
        { label: "Relatórios", icon: <FileText size={18} /> },
        { label: "Configurações", icon: <BarChart3 size={18} /> },
    ];

    return (
        <aside className="flex w-[270px] flex-col border-r border-slate-200 bg-white px-6 py-7">
            <div className="mb-10 flex items-center gap-2">
                <img src={"./logo.png"}/>
                <div className="h-6 w-6 rounded-full bg-red-500" />
                <div className="text-2xl font-semibold tracking-tight">
                    <span className="text-red-600">engravida</span>{" "}
                    <span className="text-base font-normal text-amber-700">Insights</span>
                </div>
            </div>

            <nav className="space-y-2">
                {items.map((item) => {
                    const active = item.label === "Dashboard";

                    return (
                        <div
                            key={item.label}
                            className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm ${
                                active
                                    ? "bg-red-50 font-semibold text-red-500"
                                    : "text-slate-500 hover:bg-slate-50"
                            }`}
                        >
                            {item.icon}
                            {item.label}
                        </div>
                    );
                })}
            </nav>

            <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    <div>
                        <div>Atualizado em</div>
                        <div>Há 8 minutos</div>
                    </div>
                    <RefreshCcw size={18} />
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                    <HelpCircle className="text-red-500" size={24} />
                    <div>
                        <div>Precisa de ajuda?</div>
                        <div>Central de ajuda</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function Header() {
    return (
        <header className="mb-8 flex items-start justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Dashboard Executivo
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Visão geral do atendimento e da conversão
                </p>
            </div>

            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
                <button className="rounded-lg bg-red-500 px-6 py-3 text-sm font-semibold text-white">
                    7 dias
                </button>
                <button className="px-6 py-3 text-sm font-medium text-slate-600">
                    30 dias
                </button>
                <button className="px-6 py-3 text-sm font-medium text-slate-600">
                    90 dias
                </button>
                <button className="border-l border-slate-200 px-4 py-3 text-slate-500">
                    <Calendar size={16} />
                </button>
            </div>
        </header>
    );
}

function KpiCard({
                     icon,
                     label,
                     value,
                     trend,
                 }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend: string;
}) {
    return (
        <Card>
            <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    {icon}
                </div>

                <div>
                    <div className="text-xs font-medium text-slate-500">{label}</div>
                    <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
                    <div className="mt-2 text-xs font-medium text-emerald-600">{trend}</div>
                </div>
            </div>
        </Card>
    );
}

function ScoreCard({ data }: { data: ExecutiveDashboardData }) {
    const score = data.attendance_score.overall_score;

    return (
        <Card>
            <h2 className="mb-6 text-lg font-bold">Score geral do atendimento</h2>

            <div className="grid grid-cols-[220px_1fr] gap-4">
                <div className="relative h-52 w-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: "score", value: score },
                                    { name: "rest", value: 100 - score },
                                ]}
                                dataKey="value"
                                innerRadius={78}
                                outerRadius={96}
                                startAngle={90}
                                endAngle={-270}
                            >
                                <Cell fill="#7460ee" />
                                <Cell fill="#eee9ff" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-6xl font-bold text-slate-800">{score}</div>
                        <div className="text-lg text-slate-500">/ 100</div>
                    </div>
                </div>

                <div>
                    <div className="mb-5 space-y-3 text-sm">
                        <ScoreLegend color="bg-emerald-500" label="Excelente" range="80 – 100" />
                        <ScoreLegend color="bg-blue-500" label="Bom" range="60 – 79" />
                        <ScoreLegend color="bg-orange-500" label="Precisa melhorar" range="0 – 59" />
                    </div>

                    <div className="space-y-4 border-t border-slate-200 pt-5">
                        <ScoreHighlight
                            color="emerald"
                            title="Boa resolução"
                            description="Resolução acima da média do período anterior."
                        />
                        <ScoreHighlight
                            color="orange"
                            title="Queda após preço"
                            description="Momento crítico impactando a conversão."
                        />
                        <ScoreHighlight
                            color="blue"
                            title="Tempo de resposta estável"
                            description="1ª resposta humana dentro do esperado."
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
}

function DropoffCard({ data }: { data: ExecutiveDashboardData }) {
    return (
        <Card>
            <div className="mb-5">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Momentos de perda mais comuns</h2>
                    <HelpCircle size={16} className="text-slate-400" />
                </div>
                <p className="mt-1 text-xs text-slate-500">Base: conversas não resolvidas</p>
            </div>

            <div className="space-y-5">
                {data.dropoff_moments.map((item, index) => (
                    <div key={item.moment}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">
                  {index + 1}
                </span>
                                <span className="font-medium text-slate-700">{item.label}</span>
                            </div>
                            <span className="font-bold text-slate-700">{item.percentage}%</span>
                        </div>

                        <div className="ml-9 h-2 rounded-full bg-violet-100">
                            <div
                                className="h-2 rounded-full bg-violet-500"
                                style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function ConversationGoalsCard({ data }: { data: ExecutiveDashboardData }) {
    const colors = ["#8b5cf6", "#1683ff", "#10b981", "#f97316", "#06b6d4"];

    return (
        <Card>
            <div className="mb-4 flex items-center gap-2">
                <h2 className="text-lg font-bold">Objetivo das conversas</h2>
                <HelpCircle size={16} className="text-slate-400" />
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <div className="relative h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.conversation_goals}
                                dataKey="percentage"
                                nameKey="label"
                                innerRadius={52}
                                outerRadius={82}
                            >
                                {data.conversation_goals.map((_, index) => (
                                    <Cell key={index} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-xl font-bold">
                            {data.kpis.conversations_analyzed.toLocaleString("pt-BR")}
                        </div>
                        <div className="text-xs text-slate-500">conversas</div>
                    </div>
                </div>

                <div className="space-y-3">
                    {data.conversation_goals.map((item, index) => (
                        <div key={item.goal} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                />
                                <span className="text-slate-600">{item.label}</span>
                            </div>
                            <span className="font-medium text-slate-600">{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

function UnitViewCard({ data }: { data: ExecutiveDashboardData }) {
    return (
        <Card>
            <h2 className="mb-5 text-lg font-bold">Visão por unidade</h2>

            <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                    <div>Unidade</div>
                    <div>Resolução</div>
                    <div>Satisfação</div>
                    <div>Agendamento</div>
                </div>

                {data.by_unit.map((unit) => (
                    <div
                        key={unit.unit_id ?? unit.unit_name}
                        className="grid grid-cols-4 border-t border-slate-100 px-4 py-3 text-sm"
                    >
                        <div className="font-medium text-slate-600">{unit.unit_name}</div>
                        <div className="font-bold text-emerald-600">{unit.resolution_rate}%</div>
                        <div className="font-bold text-emerald-600">{unit.satisfaction_rate}%</div>
                        <div
                            className={
                                unit.scheduling_rate < 40
                                    ? "font-bold text-orange-500"
                                    : "font-bold text-emerald-600"
                            }
                        >
                            {unit.scheduling_rate}%
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {children}
        </div>
    );
}

function FilterButton({
                          icon,
                          label,
                      }: {
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
            {icon}
            {label}
            <span className="text-slate-400">⌄</span>
        </button>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${color}`} />
            <span>{label}</span>
        </div>
    );
}

function ScoreLegend({
                         color,
                         label,
                         range,
                     }: {
    color: string;
    label: string;
    range: string;
}) {
    return (
        <div className="grid grid-cols-[14px_1fr_auto] items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${color}`} />
            <span className="font-medium text-slate-600">{label}</span>
            <span className="text-slate-400">{range}</span>
        </div>
    );
}

function ScoreHighlight({
                            color,
                            title,
                            description,
                        }: {
    color: "emerald" | "orange" | "blue";
    title: string;
    description: string;
}) {
    const styles = {
        emerald: "border-emerald-500 text-emerald-600",
        orange: "border-orange-500 text-orange-500",
        blue: "border-blue-500 text-blue-600",
    };

    return (
        <div className="flex items-start gap-3">
            <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${styles[color]}`}
            >
                ✓
            </div>
            <div>
                <div className="text-sm font-bold text-slate-800">{title}</div>
                <div className="text-xs text-slate-500">{description}</div>
            </div>
        </div>
    );
}
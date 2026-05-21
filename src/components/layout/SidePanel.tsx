// src/components/layout/SidePanel.tsx
import type { ReactNode } from "react";
import {
    BarChart3,
    FileText,
    HelpCircle,
    LayoutDashboard,
    MessageCircle,
    RefreshCcw,
    Settings,
    ShieldCheck,
    Users,
} from "lucide-react";

type SidePanelItem = {
    label: string;
    icon: ReactNode;
    active?: boolean;
};

type SidePanelProps = {
    items?: SidePanelItem[];
};

const defaultItems: SidePanelItem[] = [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, active: true },
    { label: "Conversas", icon: <MessageCircle size={18} /> },
    { label: "Jornada", icon: <ShieldCheck size={18} /> },
    { label: "Atendentes", icon: <Users size={18} /> },
    { label: "Relatórios", icon: <FileText size={18} /> },
    { label: "Configurações", icon: <Settings size={18} /> },
];

export default function SidePanel({ items = defaultItems }: SidePanelProps) {
    return (
        <aside
            className="flex w-[270px] flex-col border-r px-6 py-7"
            style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
            }}
        >
            <div className="mb-10 flex items-center gap-2">
                <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: "var(--color-brand)" }}
                />

                <div className="text-2xl font-semibold tracking-tight">
                    <span style={{ color: "var(--color-brand)" }}>engravida</span>{" "}
                    <span className="text-base font-normal text-amber-700">
            Insights
          </span>
                </div>
            </div>

            <nav className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center gap-4 rounded-xl px-4 py-3 text-sm transition"
                        style={{
                            backgroundColor: item.active
                                ? "var(--color-brand-soft)"
                                : "transparent",
                            color: item.active ? "var(--color-brand)" : "var(--color-muted)",
                            fontWeight: item.active ? 600 : 500,
                        }}
                    >
                        {item.icon}
                        {item.label}
                    </div>
                ))}
            </nav>

            <div className="mt-auto space-y-4">
                <div
                    className="flex items-center justify-between rounded-xl border p-4 text-sm"
                    style={{
                        borderColor: "var(--color-border)",
                        color: "var(--color-muted)",
                    }}
                >
                    <div>
                        <div>Atualizado em</div>
                        <div>Há 8 minutos</div>
                    </div>
                    <RefreshCcw size={18} />
                </div>

                <div
                    className="flex items-center gap-3 rounded-xl border p-4 text-xs"
                    style={{
                        borderColor: "var(--color-border)",
                        color: "var(--color-muted)",
                    }}
                >
                    <HelpCircle style={{ color: "var(--color-brand)" }} size={24} />
                    <div>
                        <div>Precisa de ajuda?</div>
                        <div>Central de ajuda</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export const __uiDemo = {
    element: <SidePanel />,
    code: "<SidePanel />",
};
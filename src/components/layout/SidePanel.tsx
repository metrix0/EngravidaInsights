// src/components/layout/SidePanel.tsx
import type { ReactNode } from "react";
import {
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
        <aside className="sticky left-0 top-0 z-40 flex h-screen max-h-screen w-[250px] flex-col overflow-y-auto border-r border-border bg-card px-6 py-7">
            <div className="mb-10 flex items-center gap-2">
                <img src="/logo.png" className="h-6" alt="Engravida" />

                <div className="text-2xl font-semibold tracking-tight">
          <span className="text-base font-normal text-amber-700">
            Insights
          </span>
                </div>
            </div>

            <nav className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm transition ${
                            item.active
                                ? "bg-brand-soft font-semibold text-brand"
                                : "font-medium text-muted hover:bg-slate-50"
                        }`}
                    >
                        {item.icon}
                        {item.label}
                    </div>
                ))}
            </nav>

            <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border p-4 text-sm text-muted">
                    <div>
                        <div>Atualizado em</div>
                        <div>Há 8 minutos</div>
                    </div>
                    <RefreshCcw size={18} />
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border p-4 text-xs text-muted">
                    <HelpCircle className="text-brand" size={24} />
                    <div>
                        <div>Precisa de ajuda?</div>
                        <div>Central de ajuda</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

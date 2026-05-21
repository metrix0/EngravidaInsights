// src/components/ui/FilterButton.tsx
import type { ReactNode } from "react";

type FilterButtonProps = {
    icon?: ReactNode;
    label: string;
};

export default function FilterButton({ icon, label }: FilterButtonProps) {
    return (
        <button
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-slate-50"
            style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                color: "var(--color-muted)",
            }}
        >
            {icon}
            {label}
            <span className="text-slate-400">⌄</span>
        </button>
    );
}

export const __uiDemo = {
    element: <FilterButton label="Todas as unidades" />,
    code: '<FilterButton label="Todas as unidades" />',
};
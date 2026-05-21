// src/components/ui/KpiCard.tsx
import type { ReactNode } from "react";
import Card from "./Card";

type KpiCardColor = "brand" | "green" | "blue" | "orange" | "purple";

type KpiCardProps = {
    icon: ReactNode;
    label: string;
    value: string;
    trend?: string;
    color?: KpiCardColor;
};

const colorClasses: Record<KpiCardColor, string> = {
    brand: "bg-brand-soft text-brand",
    green: "bg-green-soft text-green",
    blue: "bg-blue-soft text-blue",
    orange: "bg-orange-soft text-orange",
    purple: "bg-purple-soft text-purple",
};

export default function KpiCard({
                                    icon,
                                    label,
                                    value,
                                    trend,
                                    color = "brand",
                                }: KpiCardProps) {
    return (
        <Card>
            <div className="flex items-center gap-5">
                <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full ${colorClasses[color]}`}
                >
                    {icon}
                </div>

                <div>
                    <div className="text-xs font-medium text-muted">{label}</div>

                    <div className="mt-1 text-3xl font-bold tracking-tight text-text">
                        {value}
                    </div>

                    {trend && (
                        <div className="mt-2 text-xs font-medium text-green">
                            {trend}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

export const __uiDemo = {
    element: (
        <KpiCard
            icon={<span>✓</span>}
            label="Resolução real"
            value="78%"
            trend="↑ 6,4% vs. 7 dias anteriores"
            color="green"
        />
    ),
    code: `<KpiCard
  icon={<span>✓</span>}
  label="Resolução real"
  value="78%"
  trend="↑ 6,4% vs. 7 dias anteriores"
  color="green"
/>`,
};
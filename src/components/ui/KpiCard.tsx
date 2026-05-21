// src/components/ui/KpiCard.tsx
import type { ReactNode } from "react";
import Card from "./Card";

type KpiCardProps = {
    icon: ReactNode;
    label: string;
    value: string;
    trend?: string;
    color?: "brand" | "green" | "blue" | "orange" | "purple";
};

export default function KpiCard({
                                    icon,
                                    label,
                                    value,
                                    trend,
                                    color = "brand",
                                }: KpiCardProps) {
    const colors = getColors(color);

    return (
        <Card>
            <div className="flex items-center gap-5">
                <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{
                        backgroundColor: colors.soft,
                        color: colors.main,
                    }}
                >
                    {icon}
                </div>

                <div>
                    <div
                        className="text-xs font-medium"
                        style={{ color: "var(--color-muted)" }}
                    >
                        {label}
                    </div>

                    <div
                        className="mt-1 text-3xl font-bold tracking-tight"
                        style={{ color: "var(--color-text)" }}
                    >
                        {value}
                    </div>

                    {trend && (
                        <div
                            className="mt-2 text-xs font-medium"
                            style={{ color: "var(--color-green)" }}
                        >
                            {trend}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

function getColors(color: KpiCardProps["color"]) {
    if (color === "green") {
        return {
            main: "var(--color-green)",
            soft: "var(--color-green-soft)",
        };
    }

    if (color === "blue") {
        return {
            main: "var(--color-blue)",
            soft: "var(--color-blue-soft)",
        };
    }

    if (color === "orange") {
        return {
            main: "var(--color-orange)",
            soft: "var(--color-orange-soft)",
        };
    }

    if (color === "purple") {
        return {
            main: "var(--color-purple)",
            soft: "var(--color-purple-soft)",
        };
    }

    return {
        main: "var(--color-brand)",
        soft: "var(--color-brand-soft)",
    };
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
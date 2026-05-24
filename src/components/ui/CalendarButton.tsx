// src/components/ui/CalendarButton.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export type DateRange = {
    start: string | null;
    end: string | null;
};

type CalendarButtonProps = {
    value?: DateRange;
    onChange?: (value: DateRange) => void;
    onApply?: (value: DateRange) => void;
    className?: string;
};

export default function CalendarButton({
                                           value,
                                           onChange,
                                           onApply,
                                           className = "",
                                       }: CalendarButtonProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const [open, setOpen] = useState(false);
    const [visibleDate, setVisibleDate] = useState(new Date());

    const [internalRange, setInternalRange] = useState<DateRange>({
        start: null,
        end: null,
    });

    const appliedRange = value ?? internalRange;

    const [draftRange, setDraftRange] = useState<DateRange>(appliedRange);

    const hasSelectedDate = Boolean(appliedRange.start);

    function toggleCalendar() {
        setDraftRange(appliedRange);
        setOpen((current) => !current);
    }

    function handleDateClick(dateString: string) {
        if (!draftRange.start || draftRange.end) {
            setDraftRange({
                start: dateString,
                end: null,
            });
            return;
        }

        if (dateString < draftRange.start) {
            setDraftRange({
                start: dateString,
                end: draftRange.start,
            });
            return;
        }

        setDraftRange({
            start: draftRange.start,
            end: dateString,
        });
    }

    function clearCalendarDraft() {
        const emptyRange = {
            start: null,
            end: null,
        };

        setDraftRange(emptyRange);

        if (!value) {
            setInternalRange(emptyRange);
        }

        onChange?.(emptyRange);
        onApply?.(emptyRange);

        setOpen(false);
    }

    function applyCalendar() {
        if (!value) {
            setInternalRange(draftRange);
        }

        onChange?.(draftRange);
        onApply?.(draftRange);

        setOpen(false);
    }

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!wrapperRef.current) return;

            if (!wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
                setDraftRange(appliedRange);
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, appliedRange]);

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={toggleCalendar}
                className={`ml-1 flex cursor-pointer items-center gap-2 overflow-hidden rounded-lg border-l px-4 py-3 text-sm font-semibold transition-[width,background-color,color] duration-300 ${
                    hasSelectedDate
                        ? "w-[245px] bg-brand text-white"
                        : "w-[52px] text-muted hover:bg-slate-50"
                }`}
                style={{ borderColor: "var(--color-border)" }}
            >
                <Calendar size={16} className="shrink-0" />

                <span className="min-w-[175px] whitespace-nowrap">
                    {formatRangeLabel(appliedRange)}
                </span>
            </button>

            <div
                className={`absolute right-0 z-50 mt-2 w-[320px] origin-top rounded-2xl border bg-white p-4 shadow-lg transition-all duration-150 ${
                    open
                        ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none -translate-y-1 scale-98 opacity-0"
                }`}
                style={{ borderColor: "var(--color-border)" }}
            >
                <CalendarPicker
                    visibleDate={visibleDate}
                    setVisibleDate={setVisibleDate}
                    selectedRange={draftRange}
                    onDateClick={handleDateClick}
                />

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <button
                        type="button"
                        onClick={clearCalendarDraft}
                        className="cursor-pointer rounded-lg px-3 py-2 text-xs font-medium text-muted transition hover:bg-slate-50"
                    >
                        Limpar
                    </button>

                    <button
                        type="button"
                        onClick={applyCalendar}
                        className="cursor-pointer rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}

function CalendarPicker({
                            visibleDate,
                            setVisibleDate,
                            selectedRange,
                            onDateClick,
                        }: {
    visibleDate: Date;
    setVisibleDate: (date: Date) => void;
    selectedRange: DateRange;
    onDateClick: (date: string) => void;
}) {
    const year = visibleDate.getFullYear();
    const month = visibleDate.getMonth();

    const days = getCalendarDays(year, month);
    const todayString = toDateString(new Date());

    function previousMonth() {
        setVisibleDate(new Date(year, month - 1, 1));
    }

    function nextMonth() {
        setVisibleDate(new Date(year, month + 1, 1));
    }

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <button
                    type="button"
                    onClick={previousMonth}
                    className="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-slate-50"
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="text-sm font-bold capitalize text-text">
                    {visibleDate.toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                    })}
                </div>

                <button
                    type="button"
                    onClick={nextMonth}
                    className="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-slate-50"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-muted">
                <div>D</div>
                <div>S</div>
                <div>T</div>
                <div>Q</div>
                <div>Q</div>
                <div>S</div>
                <div>S</div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const selected = isSelected(day.dateString, selectedRange);
                    const inRange = isInRange(day.dateString, selectedRange);
                    const disabled = day.dateString >= todayString;

                    return (
                        <button
                            key={day.dateString}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                                if (!disabled) {
                                    onDateClick(day.dateString);
                                }
                            }}
                            className={`h-9 rounded-lg text-sm transition ${
                                disabled
                                    ? "cursor-not-allowed bg-slate-50 text-slate-400"
                                    : selected
                                        ? "cursor-pointer bg-brand font-bold text-white"
                                        : inRange
                                            ? "cursor-pointer bg-brand-soft text-brand"
                                            : day.currentMonth
                                                ? "cursor-pointer text-text hover:bg-slate-50"
                                                : "cursor-pointer text-slate-300 hover:bg-slate-50"
                            }`}
                        >
                            {day.day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function getCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();

    const startDate = new Date(year, month, 1 - startDay);

    return Array.from({ length: 42 }).map((_, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);

        return {
            day: date.getDate(),
            currentMonth: date.getMonth() === month,
            dateString: toDateString(date),
        };
    });
}

function toDateString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isSelected(date: string, range: DateRange) {
    return date === range.start || date === range.end;
}

function isInRange(date: string, range: DateRange) {
    if (!range.start || !range.end) return false;

    return date > range.start && date < range.end;
}

function formatRangeLabel(range: DateRange) {
    if (!range.start) return "";

    if (!range.end || range.start === range.end) {
        return formatDate(range.start);
    }

    return `${formatDate(range.start)} - ${formatDate(range.end)}`;
}

function formatDate(date: string) {
    const [year, month, day] = date.split("-");

    return `${day}/${month}/${year}`;
}

export const __uiDemo = {
    element: (
        <CalendarButton
            onApply={(value) => console.log("Applied range:", value)}
        />
    ),
    code: `<CalendarButton
  value={selectedRange}
  onChange={setSelectedRange}
  onApply={() => setPeriod(null)}
/>`,
};
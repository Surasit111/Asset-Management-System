import React, { useState, useEffect } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface ThaiDateInputProps {
    value: string; // Expected: YYYY-MM-DD
    onChange: (dateString: string) => void;
    placeholder?: string;
    required?: boolean;
}

export function ThaiDateInput({ value, onChange, placeholder = "DD/MM/YYYY", required }: ThaiDateInputProps) {
    const [displayValue, setDisplayValue] = useState("");
    const [align, setAlign] = useState<"start" | "end">("start");

    useEffect(() => {
        const handleResize = () => {
            setAlign(window.innerWidth < 1024 ? "end" : "start");
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Safely parse the value into a Date (handles ISO strings too)
    const safeDate = (): Date | undefined => {
        if (!value) return undefined;
        const safe = value.includes("T") ? value.split("T")[0] : value;
        const parsed = parseISO(safe);
        return isValid(parsed) ? parsed : undefined;
    };

    // Sync from parent value (YYYY-MM-DD) to Thai display (DD/MM/YYYY พ.ศ.)
    useEffect(() => {
        let safeValue = value || "";
        if (safeValue.includes("T")) {
            safeValue = safeValue.split("T")[0];
        }

        if (safeValue && safeValue.includes("-")) {
            const [y, m, d] = safeValue.split("-");
            if (y && m && d) {
                const thaiYear = parseInt(y, 10) + 543;
                setDisplayValue(`${d}/${m}/${thaiYear}`);
            }
        } else if (!value) {
            setDisplayValue("");
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, ""); // Remove non-digits
        if (val.length > 8) val = val.slice(0, 8); // Max 8 digits

        // Auto format as DD/MM/YYYY
        let formatted = val;
        if (val.length > 4) {
            formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
        } else if (val.length > 2) {
            formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
        }

        setDisplayValue(formatted);

        // Only update parent when full 8 digits entered
        if (val.length === 8) {
            const d = parseInt(val.slice(0, 2), 10);
            const m = parseInt(val.slice(2, 4), 10);
            const y = parseInt(val.slice(4, 8), 10);

            // Accept both B.E. (>=2400) and C.E. (>=1900)
            const christianYear = y >= 2400 ? y - 543 : y;
            if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && christianYear >= 1900) {
                const monthStr = m.toString().padStart(2, "0");
                const dayStr = d.toString().padStart(2, "0");
                onChange(`${christianYear}-${monthStr}-${dayStr}`);
                return;
            }
        }

        // If input cleared completely
        if (val.length === 0) {
            onChange("");
        }
    };

    const selectedDate = safeDate();

    return (
        <div className="relative">
            <input
                type="text"
                className="input w-full pr-10 bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium text-[#0f172a] h-10 outline-none focus:ring-2 focus:ring-[#0f172a]/5 transition-all"
                value={displayValue}
                onChange={handleInputChange}
                placeholder={placeholder}
                required={required}
                maxLength={10}
            />
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label="เลือกวันที่จากปฏิทิน"
                        title="เลือกวันที่"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#0f172a] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <CalendarIcon size={16} />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 overflow-hidden z-200" align={align} side="bottom" sideOffset={6} avoidCollisions={false}>
                    <Calendar
                        key={value || "empty"}
                        mode="single"
                        selected={selectedDate}
                        defaultMonth={selectedDate}
                        onSelect={(date: Date | undefined) => {
                            if (date) {
                                onChange(format(date, "yyyy-MM-dd"));
                            } else {
                                onChange("");
                            }
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

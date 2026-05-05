"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"
import { th } from "date-fns/locale"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  navVariant?: "top" | "side"
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  navVariant = "top",
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={th}
      className={cn("p-3 bg-white", className)}
      formatters={{
        formatCaption: (date, options) => {
          const thaiYear = date.getFullYear() + 543;
          const month = date.toLocaleString("th-TH", { month: "long" });
          return `${month} ${thaiYear}`;
        },
        formatYearDropdown: (date) => `${date.getFullYear() + 543}`,
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          navVariant === "side" && "pl-12",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1",
          navVariant === "top"
            ? "w-full absolute top-0 inset-x-0 justify-between"
            : "absolute left-0 top-1/2 -translate-y-1/2 z-10 flex-col bg-white border border-gray-100 rounded-lg p-0.5 shadow-sm",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg hover:bg-gray-100 pointer-events-auto select-none",
          navVariant === "side" && "h-7 w-7 opacity-100 border-b border-gray-100 rounded-b-none"
        ),
        button_next: cn(
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg hover:bg-gray-100 pointer-events-auto select-none",
          navVariant === "side" && "h-7 w-7 opacity-100 rounded-t-none"
        ),
        month_caption: cn(
          "flex items-center justify-center h-8 w-full",
          navVariant === "top" && "px-8",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "text-sm font-bold text-gray-900 select-none",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-gray-400 rounded-md w-9 font-normal text-[0.8rem] uppercase tracking-tighter text-center select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "relative h-9 w-9 p-0 text-center text-sm",
          defaultClassNames.day
        ),
        range_start: cn(defaultClassNames.range_start),
        range_middle: cn(defaultClassNames.range_middle),
        range_end: cn(defaultClassNames.range_end),
        today: cn(defaultClassNames.today),
        outside: cn(
          "text-gray-500",
          defaultClassNames.outside
        ),
        disabled: cn("text-gray-500 opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) => {
          if (orientation === "left")
            return <ChevronLeft className="h-4 w-4" {...chevronProps} />
          if (orientation === "right")
            return <ChevronRight className="h-4 w-4" {...chevronProps} />
          return <ChevronRight className="h-4 w-4" {...chevronProps} />
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelectedSingle =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected || undefined}
      data-range-start={modifiers.range_start || undefined}
      data-range-end={modifiers.range_end || undefined}
      data-range-middle={modifiers.range_middle || undefined}
      data-selected-single={isSelectedSingle || undefined}
      className={cn(
        "h-9 w-9 p-0 font-normal outline-none flex items-center justify-center text-sm cursor-pointer",
        !modifiers.selected && "rounded-lg hover:bg-gray-100 hover:text-gray-900",
        isSelectedSingle && "bg-[#0f172a] text-white rounded-lg focus:bg-[#0f172a] focus:text-white",
        modifiers.range_start && "bg-[#0f172a] text-white rounded-l-lg",
        modifiers.range_end && "bg-[#0f172a] text-white rounded-r-lg",
        modifiers.range_start && modifiers.range_end && "rounded-lg",
        modifiers.range_middle && "bg-gray-100 text-gray-900 rounded-none hover:bg-gray-200",
        modifiers.today && !modifiers.selected && "bg-gray-100 text-gray-900 font-bold rounded-lg",
        modifiers.outside && "text-gray-500",
        modifiers.disabled && "text-gray-500 opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }

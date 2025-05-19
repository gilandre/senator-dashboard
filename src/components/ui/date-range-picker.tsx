"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format } from "date-fns"
import { fr } from 'date-fns/locale';
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: DateRange | undefined
  onChange: (date: DateRange | undefined) => void
  className?: string
  align?: "center" | "start" | "end"
  disabled?: boolean
}

export function DateRangePicker({
  value,
  onChange,
  className,
  align = "start",
  disabled = false,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value)

  // Synchroniser l'état local avec les props lorsque value change
  React.useEffect(() => {
    setDate(value);
  }, [value]);

  // Presets pour les plages de dates courantes
  const presets = [
    {
      name: "Aujourd'hui",
      range: {
        from: new Date(),
        to: new Date(),
      },
    },
    {
      name: "7 derniers jours",
      range: {
        from: addDays(new Date(), -7),
        to: new Date(),
      },
    },
    {
      name: "14 derniers jours",
      range: {
        from: addDays(new Date(), -14),
        to: new Date(),
      },
    },
    {
      name: "30 derniers jours",
      range: {
        from: addDays(new Date(), -30),
        to: new Date(),
      },
    },
  ]

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d LLL y", { locale: fr })} -{" "}
                  {format(date.to, "d LLL y", { locale: fr })}
                </>
              ) : (
                format(date.from, "d LLL y", { locale: fr })
              )
            ) : (
              <span>Sélectionner une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align={align}
          sideOffset={4}
        >
          <div className="flex flex-col space-y-3 p-3 sm:flex-row sm:space-x-3 sm:space-y-0">
            <div className="flex flex-col space-y-2">
              {presets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={() => {
                    setDate(preset.range)
                    onChange(preset.range)
                  }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            <div className="border-t sm:border-t-0 sm:border-l my-2 sm:my-0" />
            <div className="relative">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from || new Date()}
                selected={date}
                onSelect={(selectedDate) => {
                  setDate(selectedDate)
                  onChange(selectedDate)
                }}
                numberOfMonths={2}
                locale={fr}
                disabled={disabled}
                classNames={{
                  month: "space-y-3",
                  caption_label: "text-sm font-medium",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent/50",
                  day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 
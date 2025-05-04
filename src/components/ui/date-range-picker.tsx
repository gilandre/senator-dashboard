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
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value)

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
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col space-y-2 p-2 sm:flex-row sm:space-x-2 sm:space-y-0">
            <div className="flex flex-col space-y-2">
              {presets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDate(preset.range)
                    onChange(preset.range)
                  }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            <div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(selectedDate) => {
                  setDate(selectedDate)
                  onChange(selectedDate)
                }}
                numberOfMonths={2}
                locale={fr}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 
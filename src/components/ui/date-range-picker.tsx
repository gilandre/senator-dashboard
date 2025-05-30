"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from 'date-fns/locale'
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DATE_FORMATS, DATE_PICKER_PRESETS } from "@/lib/constants"

interface DateRangePickerProps {
  value?: DateRange | undefined
  onChange: (date: DateRange | undefined) => void
  className?: string
  align?: "center" | "start" | "end"
  disabled?: boolean
  showPresets?: boolean
  format?: keyof typeof DATE_FORMATS
}

export function DateRangePicker({
  value,
  onChange,
  className,
  align = "start",
  disabled = false,
  showPresets = true,
  format: dateFormat = "DISPLAY",
}: DateRangePickerProps) {
  // Utilisation de useReducer pour une meilleure gestion des états
  const [state, dispatch] = React.useReducer(
    (state: { date: DateRange | undefined }, action: { type: string; payload?: DateRange }) => {
      switch (action.type) {
        case "SET_DATE":
          return { ...state, date: action.payload }
        case "RESET":
          return { ...state, date: undefined }
        default:
          return state
      }
    },
    { date: value }
  )

  // Synchronisation avec les props
  React.useEffect(() => {
    if (value !== state.date) {
      dispatch({ type: "SET_DATE", payload: value })
    }
  }, [value])

  // Gestionnaire de changement de date
  const handleDateChange = React.useCallback((newDate: DateRange | undefined) => {
    dispatch({ type: "SET_DATE", payload: newDate })
    onChange(newDate)
  }, [onChange])

  // Gestionnaire de preset
  const handlePresetSelect = React.useCallback((preset: typeof DATE_PICKER_PRESETS[number]) => {
    handleDateChange(preset.range)
  }, [handleDateChange])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !state.date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {state.date?.from ? (
              state.date.to ? (
                <>
                  {format(state.date.from, DATE_FORMATS[dateFormat], { locale: fr })} -{" "}
                  {format(state.date.to, DATE_FORMATS[dateFormat], { locale: fr })}
                </>
              ) : (
                format(state.date.from, DATE_FORMATS[dateFormat], { locale: fr })
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
            {showPresets && (
              <>
                <div className="flex flex-col space-y-2">
                  {DATE_PICKER_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      className="justify-start font-normal"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
                <div className="border-t sm:border-t-0 sm:border-l my-2 sm:my-0" />
              </>
            )}
            <div className="relative">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={state.date?.from || new Date()}
                selected={state.date}
                onSelect={handleDateChange}
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

interface DatePickerWithRangeProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
}

export function DatePickerWithRange({
  date,
  onDateChange,
  className,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd/MM/yyyy', { locale: fr })} -{' '}
                  {format(date.to, 'dd/MM/yyyy', { locale: fr })}
                </>
              ) : (
                format(date.from, 'dd/MM/yyyy', { locale: fr })
              )
            ) : (
              <span>Sélectionner une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
} 
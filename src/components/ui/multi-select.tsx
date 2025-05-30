"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type Option = {
  value: string | number
  label: string
}

interface MultiSelectProps {
  options: Option[]
  value: Option[]
  onChange: (value: Option[]) => void
  placeholder?: string
  isLoading?: boolean
  isDisabled?: boolean
  noOptionsMessage?: () => string
  className?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Sélectionner...",
  isLoading = false,
  isDisabled = false,
  noOptionsMessage = () => "Aucune option disponible",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  // Log component state for debugging
  React.useEffect(() => {
    console.log("MultiSelect - Props:", {
      optionsCount: options.length,
      valueCount: value.length,
      isLoading
    });
  }, [options, value, isLoading]);

  const handleSelect = (option: Option) => {
    console.log("Option sélectionnée:", option);
    const isSelected = value.some((item) => item.value === option.value)
    if (isSelected) {
      onChange(value.filter((item) => item.value !== option.value))
    } else {
      onChange([...value, option])
    }
  }

  const handleRemove = (option: Option) => {
    console.log("Option supprimée:", option);
    onChange(value.filter((item) => item.value !== option.value))
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value.length && "text-muted-foreground"
            )}
            onClick={() => {
              console.log("MultiSelect - Bouton cliqué");
            }}
          >
            {value.length > 0 ? (
              <div className="flex gap-1 flex-wrap max-w-[90%]">
                {value.length > 2 ? (
                  <Badge variant="secondary" className="rounded-sm">
                    {value.length} sélectionnés
                  </Badge>
                ) : (
                  value.map((item) => (
                    <Badge
                      key={item.value}
                      variant="secondary"
                      className="rounded-sm"
                    >
                      {item.label}
                    </Badge>
                  ))
                )}
              </div>
            ) : (
              <span>{isLoading ? "Chargement..." : placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Rechercher..." />
            <CommandEmpty>
              {isLoading ? "Chargement..." : noOptionsMessage()}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {options.length === 0 && !isLoading ? (
                <div className="px-2 py-3 text-sm text-center text-muted-foreground">
                  Aucune option disponible
                </div>
              ) : (
                options.map((option) => {
                  const isSelected = value.some(
                    (item) => item.value === option.value
                  )
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        console.log("CommandItem sélectionné:", option);
                        handleSelect(option);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span>{option.label}</span>
                      </div>
                    </CommandItem>
                  )
                })
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {value.map((item) => (
            <Badge
              key={item.value}
              variant="secondary"
              className="rounded-sm px-2 py-1 hover:bg-secondary/80"
            >
              {item.label}
              <button
                type="button"
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleRemove(item)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                <span className="sr-only">Supprimer {item.label}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
} 
import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Search, ChevronDown, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchableSelectOption {
  value: string
  label: string
  sublabel?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyMessage = "Tidak ditemukan",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
  )

  const selected = options.find((o) => o.value === value)

  // Calculate dropdown position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = 280 // max height estimate

    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight

    setDropdownStyle({
      position: 'fixed' as const,
      left: rect.left,
      width: rect.width,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      zIndex: 9999,
    })
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Focus search & position when opened
  useEffect(() => {
    if (open) {
      updatePosition()
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open, updatePosition])

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePosition()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onScroll)
    }
  }, [open, updatePosition])

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
    >
      {/* Search Input */}
      <div className="p-2 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-teal-300 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Options */}
      <div className="max-h-52 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-slate-400">{emptyMessage}</div>
        ) : (
          filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onValueChange(option.value)
                setOpen(false)
                setSearch("")
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                value === option.value
                  ? "bg-teal-50 text-teal-800"
                  : "hover:bg-slate-50 text-slate-700"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium truncate", value === option.value && "text-teal-700")}>
                  {option.label}
                </p>
                {option.sublabel && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{option.sublabel}</p>
                )}
              </div>
              {value === option.value && (
                <Check className="h-4 w-4 text-teal-600 shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(!open); setSearch("") }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm transition-all outline-none",
          "hover:border-slate-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open ? "border-teal-400 ring-2 ring-teal-100" : "border-slate-200",
          !selected && "text-slate-400"
        )}
      >
        <span className="truncate text-left flex-1">
          {selected ? (
            <span className="text-slate-800 font-medium">{selected.label}</span>
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              role="button"
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={(e) => { e.stopPropagation(); onValueChange(""); setOpen(false) }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {dropdown}
    </div>
  )
}

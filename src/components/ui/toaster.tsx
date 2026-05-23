import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg transition-all duration-300 ${
            t.open
              ? "animate-in slide-in-from-bottom-4 fade-in"
              : "animate-out slide-out-to-right-full fade-out"
          } ${
            t.variant === "destructive"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="text-sm font-bold leading-tight">{t.title}</p>
              )}
              {t.description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

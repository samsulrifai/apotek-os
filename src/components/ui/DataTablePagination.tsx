import { Button } from "./button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange
}: DataTablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 bg-slate-50/50">
      <div className="flex-1 text-sm text-slate-500 font-medium">
        Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} data
      </div>
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-700 hidden sm:block">Baris per halaman</p>
          <Select
            value={`${itemsPerPage}`}
            onValueChange={(value) => onItemsPerPageChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent side="top" className="bg-white">
              {[10, 20, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium text-slate-700">
          Hal {currentPage} dari {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <span className="sr-only">Halaman sebelumnya</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <span className="sr-only">Halaman selanjutnya</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

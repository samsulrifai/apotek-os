import { Input } from "./input"
import { TableHead } from "./table"

interface DataTableColumnHeaderProps {
  title: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
  hideFilter?: boolean;
}

export function DataTableColumnHeader({ 
  title, 
  filterValue = '', 
  onFilterChange, 
  className,
  align = 'left',
  hideFilter = false
}: DataTableColumnHeaderProps) {
  return (
    <TableHead className={className}>
      <div className={`flex flex-col gap-2 py-2 ${align === 'center' ? 'items-center' : align === 'right' ? 'items-end' : 'items-start'}`}>
        <span className="font-bold text-slate-500 whitespace-nowrap">{title}</span>
        {!hideFilter && onFilterChange && (
          <Input 
            placeholder="Filter..." 
            value={filterValue} 
            onChange={(e) => onFilterChange(e.target.value)}
            className="h-7 text-xs font-normal border-slate-200 bg-white/50 focus:bg-white min-w-[80px]"
          />
        )}
      </div>
    </TableHead>
  )
}

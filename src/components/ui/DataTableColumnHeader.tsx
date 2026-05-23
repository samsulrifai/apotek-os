import { TableHead } from "./table"

interface DataTableColumnHeaderProps {
  title: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  // Legacy props kept for compatibility but ignored
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  hideFilter?: boolean;
}

export function DataTableColumnHeader({ 
  title, 
  className,
  align = 'left',
}: DataTableColumnHeaderProps) {
  return (
    <TableHead className={className}>
      <span className={`font-bold text-slate-500 whitespace-nowrap block py-1 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}>
        {title}
      </span>
    </TableHead>
  )
}

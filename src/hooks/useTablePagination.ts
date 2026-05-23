import { useState, useMemo, useEffect } from 'react';

export function useTablePagination<T>(data: T[], defaultItemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [globalSearch, setGlobalSearch] = useState('');

  const filteredData = useMemo(() => {
    let result = data;
    
    // Global search
    if (globalSearch) {
      const lower = globalSearch.toLowerCase();
      result = result.filter(item => 
        Object.values(item as any).some(val => 
          String(val || '').toLowerCase().includes(lower)
        )
      );
    }

    // Column filters
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (!value) return;
      const lower = value.toLowerCase();
      result = result.filter(item => {
        const itemValue = (item as Record<string, any>)[key];
        return String(itemValue || '').toLowerCase().includes(lower);
      });
    });

    return result;
  }, [data, globalSearch, columnFilters]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 if search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, columnFilters, itemsPerPage]);

  const setFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const getFilter = (key: string) => columnFilters[key] || '';

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    columnFilters,
    setColumnFilters,
    setFilter,
    getFilter,
    globalSearch,
    setGlobalSearch,
    filteredData,
    paginatedData,
    totalPages,
    totalItems: filteredData.length
  };
}

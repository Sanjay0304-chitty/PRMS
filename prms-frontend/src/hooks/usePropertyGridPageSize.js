import { useEffect, useState } from 'react';

// Round the usual 12 results up to a whole number of actual grid rows.
export function usePropertyGridPageSize() {
  const [grid, setGrid] = useState(null);
  const [pageSize, setPageSize] = useState(12);
  useEffect(() => {
    if (!grid) return;
    const measure = () => {
      const columns = window.getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (columns > 0) setPageSize(Math.min(100, Math.ceil(12 / columns) * columns));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    measure();
    return () => observer.disconnect();
  }, [grid]);
  return { gridRef: setGrid, pageSize };
}

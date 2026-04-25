import React, { useState, useMemo } from "react";
import { Box } from "@mui/material";
import TableToolbar from "./TableToolbar";
import DataTable from "./DataTable";
import DetailPanel from "./DetailPanel";
import { EditableTableProps } from "@/app/uitools/interfaces";
import { useRouter } from "next/navigation";

export default function EditableTable<T extends { id: string }>({
  title,
  data,
  columns,
  editableFields,
  
  enableAddNew = true,
  disableRowEdit = false,
  disableRowDelete = false,
  onSave,
  onDelete, 
  dateField,
  enableDateRangeFilter,
  addNewRoute, 
}: EditableTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<T | null>(null);
  const [editable, setEditable] = useState<T | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [sortField, setSortField] = useState<keyof T | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<{
    from: string | null;
    to: string | null;
  }>({
    from: null,
    to: null,
  });
  const router = useRouter();

  // --- Handle selection ---
  const handleSelect = (item: T) => {
    if (!editableFields) return;       // evita abrir panel
    setSelected(item);
    setEditable({ ...item });
    setIsNew(false);
  };

  // --- Handle adding new item ---
  const handleAddNew = () => {
    if (!enableAddNew || disableRowEdit) return;
    if (!editableFields) return;
    //If addNewRoute is provided, redirect instead of opening detail panel
    if (addNewRoute) {
      router.push(addNewRoute);
      return;
    }


    const blankItem = editableFields.reduce((acc, field) => {
      acc[field.key] = "" as unknown as T[keyof T];
      return acc;
    }, {} as T);
    (blankItem as unknown as T & { id: string }).id = `temp-${Date.now()}`;
    setEditable(blankItem);
    setSelected(null);
    setIsNew(true);
  };

  // --- Handle field edit ---
  const handleEditField = (field: keyof T, value: unknown) => {
    if (!editable) return;
    setEditable({ ...editable, [field]: value });
  };

  // --- Handle save changes ---
  const handleSaveChanges = () => {
    if (editable && onSave) onSave(editable, isNew);
  
    if (isNew) {
      setEditable(null);
      setSelected(null);
    } else {
      setSelected(editable);
    }
  
    setIsNew(false);
  };
  

  // Handle delete item 
  const handleDelete = () => {
    if (disableRowDelete) return;
    if (editable && onDelete) {
      onDelete(editable);
      setEditable(null);
      setSelected(null);
    }
  };

  // --- Filtering + Sorting logic ---
  const filtered = data.filter((item) =>
    Object.values(item)
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const filteredByCategory = filtered.filter((item) =>
    Object.entries(filters).every(
      ([key, value]) => !value || String(item[key as keyof T]) === value
    )
  );

  const filteredByDate = !enableDateRangeFilter || !dateField || (!dateRange.from && !dateRange.to)
    ? filteredByCategory
    : filteredByCategory.filter((item) => {
        const value = String(item[dateField]);
        const itemDate = new Date(value).getTime();
        const from = dateRange.from ? new Date(dateRange.from).getTime() : null;
        const to = dateRange.to
          ? new Date(dateRange.to + "T23:59:59").getTime()
          : null;


        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
        return true;
      });


      const sortedData = useMemo(() => {
        return [...filteredByDate].sort((a, b) => {
          if (!sortField) return 0;
          const aValue = String(a[sortField] ?? "");
          const bValue = String(b[sortField] ?? "");
          return sortOrder === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        });
      }, [filteredByDate, sortField, sortOrder]);
      

  return (
    <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={4}>
      <Box flex={2}>
      <TableToolbar
        title={title}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        filters={filters}
        setFilters={setFilters}
        columns={columns}
        onAddNew={handleAddNew}
        data={sortedData}
        enableDateRangeFilter={enableDateRangeFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

        <DataTable columns={columns} data={sortedData} onSelect={handleSelect} />
      </Box>

      <Box flex={1}>
      <Box flex={1}>
      <DetailPanel
          editable={editable ?? selected}
          editableFields={editableFields || []}
          isNew={isNew}
          onEditField={!disableRowEdit ? handleEditField : undefined}
          onSaveChanges={!disableRowEdit ? handleSaveChanges : undefined}
          onDelete={!disableRowDelete && !isNew ? handleDelete : undefined}
          readOnly={disableRowEdit}              
        />
      </Box>

      </Box>
    </Box>
  );
}
// UI and tables

export interface ColumnDefinition<T> {
    key: keyof T;
    label: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    filterOptions?: string[];
  }
  
export interface EditableField<T> {
    key: keyof T;
    label: string;
    type?: "text" | "number" | "date" | "email" | "password" | "checkbox" | "select";
    multiline?: boolean;
    select?: boolean;
    options?: {
      value: T[keyof T];
      label: string;
    }[];
  }

export interface DataTableProps<T> {
    columns: ColumnDefinition<T>[];
    data: T[];
    onSelect: (item: T) => void;
  }
  
export interface DetailPanelProps<T> {
    editable: T | null;
    editableFields: EditableField<T>[];
    isNew: boolean;
    onEditField?: (key: keyof T, value: T[keyof T]) => void;
    onSaveChanges?: () => void;
    onDelete?: () => void;
    readOnly?: boolean;
  }
  
export interface DateRange {
    from: string | null; // YYYY-MM-DD
    to: string | null;
  }
  
export interface TableToolbarProps<T> {
    title: string;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    sortField: keyof T | "";
    setSortField: (v: keyof T | "") => void;
    sortOrder: "asc" | "desc";
    setSortOrder: (v: "asc" | "desc") => void;
    filters: Record<string, string>;
    setFilters: (v: Record<string, string>) => void;
    columns: ColumnDefinition<T>[];
    onAddNew: () => void;
    data: T[];
    enableDateRangeFilter?: boolean;
    dateRange?: DateRange;
    setDateRange?: React.Dispatch<React.SetStateAction<DateRange>>;
  }
  
export interface EditableTableProps<T> {
    title: string;
    data: T[];
    columns: ColumnDefinition<T>[];
    editableFields?: EditableField<T>[];
    searchPlaceholder?: string;
    enableAddNew?: boolean;
    disableRowEdit?: boolean;
    disableRowDelete?: boolean;
    onSave?: (updatedItem: T, isNew?: boolean) => void;
    onDelete?: (deletedItem: T) => void;
    enableDateRangeFilter?: boolean;
    dateField?: keyof T;
    addNewRoute?: string;
  }
  

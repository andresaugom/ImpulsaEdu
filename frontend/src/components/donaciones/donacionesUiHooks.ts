export const getStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return { bg: "#d1fae5", text: "#065f46" };
    case "pending":
      return { bg: "#fef3c7", text: "#92400e" };
    case "cancelled":
      return { bg: "#fee2e2", text: "#7f1d1d" };
    default:
      return { bg: "#dbeafe", text: "#0c2d6b" };
  }
};

export const getTypeColor = (type: string) => {
  switch (type) {
    case "material":
      return { bg: "#dbeafe", text: "#0c2d6b" };
    case "monetary":
      return { bg: "#d1fae5", text: "#065f46" };
    default:
      return { bg: "#dbeafe", text: "#0c2d6b" };
  }
};

export const getTypeLabel = (type: string) => {
  return type === "material" ? "Material" : "Monetaria";
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case "delivered":
      return "Entregada";
    case "pending":
      return "Pendiente";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
  }
};

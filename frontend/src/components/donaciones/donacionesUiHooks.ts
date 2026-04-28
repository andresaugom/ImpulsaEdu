export const getStatusColor = (status: string) => {
  switch (status) {
    case "Aprobado":
    case "Entregado":
      return { bg: "#d1fae5", text: "#065f46" };
    case "Entregando":
    case "Registrado":
      return { bg: "#fef3c7", text: "#92400e" };
    case "Finalizado":
      return { bg: "#a7f3d0", text: "#064e3b" };
    case "Cancelado":
      return { bg: "#fee2e2", text: "#7f1d1d" };
    default:
      return { bg: "#dbeafe", text: "#0c2d6b" };
  }
};

export const getTypeColor = (type: string) => {
  switch (type) {
    case "Material":
      return { bg: "#dbeafe", text: "#0c2d6b" };
    case "Monetaria":
      return { bg: "#d1fae5", text: "#065f46" };
    default:
      return { bg: "#dbeafe", text: "#0c2d6b" };
  }
};

export const getTypeLabel = (type: string) => {
  return type === "Material" ? "Material" : "Monetaria";
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case "Registrado":  return "Registrada";
    case "Aprobado":    return "Aprobada";
    case "Entregando":  return "En Entrega";
    case "Entregado":   return "Entregada";
    case "Finalizado":  return "Finalizada";
    case "Cancelado":   return "Cancelada";
    default:            return status;
  }
};

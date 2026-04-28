export const getStatusColor = (status: string) => {
  switch (status) {
    // School statuses
    case "active":
    // Donation statuses (Spanish DB enum)
    case "Aprobado":
    case "Entregado":
      return "#d1fae5"; // light green
    case "Entregando":
    case "Registrado":
      return "#fef3c7"; // light yellow
    case "Finalizado":
      return "#a7f3d0"; // deeper green
    case "Cancelado":
    case "archived":
      return "#fee2e2"; // light red
    default:
      return "#dbeafe"; // light blue
  }
};

export const getStatusTextColor = (status: string) => {
  switch (status) {
    case "active":
    case "Aprobado":
    case "Entregado":
      return "#004411"; // dark green
    case "Entregando":
    case "Registrado":
      return "#9c3a0b"; // dark orange
    case "Cancelado":
    case "archived":
      return "#7f1d1d"; // dark red
    case "Finalizado":
      return "#064e3b"; // darker green
    default:
      return "#0c2d6b"; // dark blue
  }
};

export const getDonationStateLabel = (status: string) => {
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

export const getSchoolStatusLabel = (status: string) => {
  switch (status) {
    case "active":   return "Activa";
    case "archived": return "Archivada";
    default:         return status;
  }
};

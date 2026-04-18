export const getStatusColor = (status: string) => {
  switch (status) {
    case "Activa":
    case "Aprobada":
    case "Entregada":
      return "#d1fae5"; // Light green
    case "En Progreso":
    case "En Transporte":
      return "#ffe4cc"; // Light orange
    case "Completada":
      return "#d1fae5"; // Light green
    default:
      return "#dbeafe"; // Light blue
  }
};

export const getStatusTextColor = (status: string) => {
  switch (status) {
    case "Activa":
    case "Aprobada":
    case "Entregada":
      return "#004411"; // Dark green
    case "En Progreso":
    case "En Transporte":
      return "#9c3a0b"; // Dark orange
    case "Completada":
      return "#004411"; // Dark green
    default:
      return "#0c2d6b"; // Dark blue
  }
};

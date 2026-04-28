export const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return { bg: "#d1fae5", text: "#065f46" };
    case "inactive":
      return { bg: "#fee2e2", text: "#7f1d1d" };
    default:
      return { bg: "#dbeafe", text: "#0c2d6b" };
  }
};

export const getTypeLabel = (type: string) => {
  return type === "Fisica" ? "Persona Física" : "Persona Moral";
};

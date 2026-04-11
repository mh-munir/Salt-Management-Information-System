export const calculateProfit = (sales: number, purchase: number) => {
  return sales - purchase;
};

export const calculateDue = (total: number, paid: number) => {
  return total - paid;
};
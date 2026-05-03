import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  type: String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  amount: Number,
  totalAmount: Number,
  saltAmount: Number,
  date: { type: Date, default: Date.now },
  editedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  editedByName: { type: String, default: "" },
  editedByRole: { type: String, default: "" },
  editedByEmail: { type: String, default: "" },
  editedAt: { type: Date, default: null },
});

TransactionSchema.index({ customerId: 1, date: -1 });
TransactionSchema.index({ supplierId: 1, date: -1 });
TransactionSchema.index({ type: 1, date: -1 });
TransactionSchema.index({ date: -1 });
// Add index for buy transactions by supplier (common query pattern)
TransactionSchema.index({ type: 1, supplierId: 1, date: -1 });
// Add index for aggregation queries filtering by type and customerId
TransactionSchema.index({ type: 1, customerId: 1, date: -1 });

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);

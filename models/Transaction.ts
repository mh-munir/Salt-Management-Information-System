import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  type: String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  amount: Number,
  totalAmount: Number,
  saltAmount: Number,
  date: { type: Date, default: Date.now },
});

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);

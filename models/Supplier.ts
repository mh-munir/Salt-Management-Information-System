import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  totalDue: { type: Number, default: 0 },
  saltAmount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
});

SupplierSchema.index({ name: 1 });
SupplierSchema.index({ phone: 1 });

export default mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);

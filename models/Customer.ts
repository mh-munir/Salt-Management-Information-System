import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  totalDue: { type: Number, default: 0 },
  saltAmount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
});

export default mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
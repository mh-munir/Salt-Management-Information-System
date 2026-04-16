import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema({
  customerId: String,
  saltAmount: Number,
  items: [
    {
      productId: String,
      quantity: Number,
      price: Number,
    }
  ],
  total: Number,
  paid: Number,
  due: Number,
  editedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  editedByName: { type: String, default: "" },
  editedByRole: { type: String, default: "" },
  editedByEmail: { type: String, default: "" },
  editedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);

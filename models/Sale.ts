import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema({
  customerId: String,
  saltAmount: Number,
  numberOfBags: { type: Number, default: 0 },
  bagType: { type: String, default: "50" },
  hockExtendedSack: { type: Number, default: 0 },
  trackExpenses: { type: Number, default: 0 },
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

SaleSchema.index({ customerId: 1, createdAt: -1 });
SaleSchema.index({ createdAt: -1 });

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);

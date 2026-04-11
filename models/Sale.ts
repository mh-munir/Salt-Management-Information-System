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
}, { timestamps: true });

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);

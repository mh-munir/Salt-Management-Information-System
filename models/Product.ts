import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: String, // মোটা/পাতলা লবণ
  quantity: Number,
  price: Number,
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
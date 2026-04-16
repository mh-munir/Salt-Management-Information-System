import mongoose from "mongoose";

const CostSchema = new mongoose.Schema(
  {
    personName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    purpose: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Cost || mongoose.model("Cost", CostSchema);

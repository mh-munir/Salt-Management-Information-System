import mongoose, { type InferSchemaType } from "mongoose";

const AdminOtpRequestSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attemptsRemaining: { type: Number, default: 5 },
  },
  { timestamps: true }
);

AdminOtpRequestSchema.index({ requestedBy: 1, email: 1 }, { unique: true });
AdminOtpRequestSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

export type AdminOtpRequestDoc = InferSchemaType<typeof AdminOtpRequestSchema>;

export default mongoose.models.AdminOtpRequest ||
  mongoose.model("AdminOtpRequest", AdminOtpRequestSchema);

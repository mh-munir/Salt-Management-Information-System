import mongoose, { type InferSchemaType } from "mongoose";

const PasswordResetOtpRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attemptsRemaining: { type: Number, default: 5 },
  },
  { timestamps: true }
);

PasswordResetOtpRequestSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetOtpRequestDoc = InferSchemaType<typeof PasswordResetOtpRequestSchema>;

export default mongoose.models.PasswordResetOtpRequest ||
  mongoose.model("PasswordResetOtpRequest", PasswordResetOtpRequestSchema);

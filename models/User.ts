import mongoose, { type InferSchemaType } from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    role: { type: String, enum: ["superadmin", "admin"], default: "admin" },
    avatarUrl: { type: String, default: "" },
    sidebarLogoUrl: { type: String, default: "" },
    sidebarHeading: { type: String, default: "" },
    sidebarSubheading: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, createdAt: -1 });

export type UserDoc = InferSchemaType<typeof UserSchema>;

export default mongoose.models.User || mongoose.model("User", UserSchema);

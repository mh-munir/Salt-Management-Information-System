import mongoose from "mongoose";

const TransportInfoSchema = new mongoose.Schema(
  {
    driverName: { type: String, required: true, trim: true },
    driverMobileNumber: { type: String, required: true, trim: true },
    helperName: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    trackNumber: { type: String, required: true, trim: true },
    drivingLicenseDataUrl: { type: String, required: true, trim: true },
    drivingLicenseFileName: { type: String, required: true, trim: true },
    helperIdCardDataUrl: { type: String, default: "", trim: true },
    helperIdCardFileName: { type: String, default: "", trim: true },
    driverIdCardDataUrl: { type: String, default: "", trim: true },
    driverIdCardFileName: { type: String, default: "", trim: true },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

TransportInfoSchema.index({ date: -1 });
TransportInfoSchema.index({ createdAt: -1 });
TransportInfoSchema.index({ driverName: 1, date: -1 });
TransportInfoSchema.index({ trackNumber: 1, date: -1 });

export default mongoose.models.TransportInfo || mongoose.model("TransportInfo", TransportInfoSchema);

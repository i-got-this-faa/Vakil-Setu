import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, unique: true, sparse: true },
    preferredLanguage: { type: String, default: "en" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

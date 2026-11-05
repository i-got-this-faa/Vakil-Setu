import mongoose from "mongoose";

const advocateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    expertise: { type: [String], required: true, default: [] },
    rating: { type: Number, default: 0 },
    experienceYears: { type: Number, default: 0 },
    availability: { type: Boolean, default: true },
    languages: { type: [String], default: ["English"] }
  },
  { timestamps: true }
);

export default mongoose.model("Advocate", advocateSchema);

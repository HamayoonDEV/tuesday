import mongoose from "mongoose";

const { Schema } = mongoose;

const tokenSchema = Schema(
  {
    userId: { type: mongoose.SchemaTypes.ObjectId, ref: "User" },
    token: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);
export default mongoose.model("RefreshToken", tokenSchema, "tokens");

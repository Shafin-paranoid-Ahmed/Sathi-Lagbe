// server/models/sosContact.js - UPDATED
const mongoose = require("mongoose");

const sosContactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Changed from "users" to "User"
      required: true,
    },
    contacts: [
      {
        name: String,
        phone: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SosContact", sosContactSchema); // Changed from "soscontacts" to "SosContact"
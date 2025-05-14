const mongoose = require("mongoose");

const sosContactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
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

module.exports = mongoose.model("soscontacts", sosContactSchema);
// Compare this snippet from server/models/user.js:
// const mongoose = require('mongoose');
//
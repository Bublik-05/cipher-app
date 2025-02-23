const mongoose = require('mongoose');

const adBlockSchema = new mongoose.Schema({
  imageUrl: String,
  text: String,
  link: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AdBlock', adBlockSchema);

const mongoose = require('mongoose');

const backgroundSchema = new mongoose.Schema({
  imageUrl: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Background', backgroundSchema);

const mongoose = require('mongoose');

const cipherSchema = new mongoose.Schema({
  name_en: { type: String, required: true },
  name_ru: { type: String, required: true },
  description_en: { type: String, required: true },
  description_ru: { type: String, required: true },
  type: { type: String, enum: ['symmetric', 'asymmetric'], required: true },
  parameters: { type: Object, default: {} }, // Например, длина ключа, режим работы
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  deletedAt: { type: Date },
});

const Cipher = mongoose.model('Cipher', cipherSchema);
module.exports = Cipher;
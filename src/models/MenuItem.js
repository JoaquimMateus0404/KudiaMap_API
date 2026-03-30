const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true },
    category: { type: String, trim: true, maxlength: 50 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, trim: true },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

menuItemSchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);
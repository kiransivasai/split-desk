import mongoose, { Schema, models } from 'mongoose';

const SettlementSchema = new Schema({
  fromUser:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  toUser:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount:     { type: Number, required: true, min: 0.01 },
  currency:   { type: String, default: 'USD' },
  amountUSD:  { type: Number },
  groupId:    { type: Schema.Types.ObjectId, ref: 'Group' },
  coveredSplits: [{
    expenseId:  { type: Schema.Types.ObjectId, ref: 'Expense' },
    splitAmount:{ type: Number },
  }],
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'venmo', 'paypal', 'cash', 'stripe', 'other'],
    default: 'bank_transfer'
  },
  reference:  { type: String },
  note:       { type: String },
  status:     { type: String, enum: ['pending', 'confirmed', 'disputed'], default: 'confirmed' },
  confirmedAt:{ type: Date, default: Date.now },
}, { timestamps: true });

SettlementSchema.index({ fromUser: 1, toUser: 1 });
SettlementSchema.index({ groupId: 1 });

export default models.Settlement || mongoose.model('Settlement', SettlementSchema);

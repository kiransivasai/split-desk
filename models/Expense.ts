import mongoose, { Schema, models } from 'mongoose';

const ExpenseSchema = new Schema({
  description:  { type: String, required: true, trim: true },
  notes:        { type: String },
  amount:       { type: Number, required: true, min: 0.01 },
  currency:     { type: String, default: 'USD' },
  amountUSD:    { type: Number },
  exchangeRate: { type: Number },
  rateDate:     { type: Date },
  category: {
    type: String,
    enum: ['travel', 'accommodation', 'food', 'transport', 'conference',
           'supplies', 'utilities', 'entertainment', 'health', 'other'],
    default: 'other'
  },
  date:         { type: Date, required: true, default: Date.now },
  paidBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId:      { type: Schema.Types.ObjectId, ref: 'Group' },
  splitMethod:  {
    type: String,
    enum: ['equal', 'percentage', 'exact', 'shares'],
    default: 'equal'
  },
  splits: [{
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount:     { type: Number, required: true },
    percentage: { type: Number },
    shares:     { type: Number },
    isPaid:     { type: Boolean, default: false },
    paidAt:     { type: Date },
  }],
  receipts: [{
    url:          { type: String },
    filename:     { type: String },
    uploadedAt:   { type: Date, default: Date.now },
  }],
  isRecurring:  { type: Boolean, default: false },
  recurringId:  { type: Schema.Types.ObjectId, ref: 'RecurringExpense' },
  createdBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  isDeleted:    { type: Boolean, default: false },
  deletedAt:    { type: Date },
}, { timestamps: true });

ExpenseSchema.index({ paidBy: 1 });
ExpenseSchema.index({ groupId: 1 });
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ 'splits.userId': 1 });

export default models.Expense || mongoose.model('Expense', ExpenseSchema);

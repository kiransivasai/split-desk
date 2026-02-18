import mongoose, { Schema, models } from 'mongoose';

const UserSchema = new Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String },
  image:      { type: String },
  phone:      { type: String },
  defaultCurrency:  { type: String, default: 'USD' },
  timezone:         { type: String, default: 'America/New_York' },
  role:         { type: String, enum: ['admin', 'member'], default: 'member' },
  notifications: {
    newExpense:       { type: Boolean, default: true },
    paymentReceived:  { type: Boolean, default: true },
    weeklyDigest:     { type: Boolean, default: true },
    overdueReminder:  { type: Boolean, default: false },
    recurringAlert:   { type: Boolean, default: true },
  },
  stats: {
    totalPaid:     { type: Number, default: 0 },
    totalOwed:     { type: Number, default: 0 },
    totalOwes:     { type: Number, default: 0 },
    lastActive:    { type: Date },
  },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.index({ email: 1 });

export default models.User || mongoose.model('User', UserSchema);

import mongoose, { Schema, models } from 'mongoose';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const GroupSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  description:  { type: String },
  emoji:        { type: String, default: '💼' },
  type:         { type: String, enum: ['trip', 'home', 'team', 'event', 'other'], default: 'team' },
  inviteCode:   { type: String, unique: true, default: generateInviteCode }, // unique: true creates an index
  simplifyDebts: { type: Boolean, default: true },
  createdBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role:       { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt:   { type: Date, default: Date.now },
    isActive:   { type: Boolean, default: true },
  }],
  totals: {
    totalSpent:   { type: Number, default: 0 },
    currency:     { type: String, default: 'INR' },
  },
  status:   { type: String, enum: ['active', 'settled', 'archived'], default: 'active' },
  startDate:  { type: Date },
  endDate:    { type: Date },
}, { timestamps: true });

GroupSchema.index({ 'members.userId': 1 });
GroupSchema.index({ createdBy: 1 });
// inviteCode index is created by unique: true option above

export default models.Group || mongoose.model('Group', GroupSchema);

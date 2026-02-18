import mongoose, { Schema, models } from 'mongoose';

const ActivityLogSchema = new Schema({
  groupId:      { type: Schema.Types.ObjectId, ref: 'Group' },
  actor:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'expense.created', 'expense.updated', 'expense.deleted',
      'settlement.created', 'settlement.confirmed',
      'group.created', 'group.member_added', 'group.member_removed',
    ]
  },
  resourceType: { type: String, enum: ['Expense', 'Settlement', 'Group', 'User'] },
  resourceId:   { type: Schema.Types.ObjectId },
  meta:         { type: Schema.Types.Mixed },
}, { timestamps: true });

ActivityLogSchema.index({ groupId: 1, createdAt: -1 });
ActivityLogSchema.index({ actor: 1 });

export default models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);

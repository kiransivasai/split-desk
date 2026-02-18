import mongoose, { Schema, models } from 'mongoose';

const FriendshipSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
}, { timestamps: true });

// Ensure unique friendship between two users regardless of order
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default models.Friendship || mongoose.model('Friendship', FriendshipSchema);

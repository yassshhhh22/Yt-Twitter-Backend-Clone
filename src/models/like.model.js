import mongoose,{ Schema} from 'mongoose';

const LikesSchema = new Schema({
    video:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
    },
    Comment:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    },
    post:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    likedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
},{ timestamps: true });
export const Like = mongoose.model('Likes', LikesSchema);
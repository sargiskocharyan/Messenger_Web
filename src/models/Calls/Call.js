const mongoose = require('mongoose')

const callSchema = new mongoose.Schema({
    callSuggestTime: {
        type: Date,
        required:true,
        index: { expires: '3d' }
    },
    type: {
        type: String,
        required: true,
        enum: ['audio', 'video'],
        default: 'video'
    },
    status: {
        type: String,
        enum: ['ongoing', 'missed', 'cancelled', 'accepted'],
        required: true,
        default: 'ongoing'
    },
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }],
    message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    callStartTime: {
        type: Date
    },
    callEndTime: {
        type: Date
    }
},
{
    timestamps: true
})


const Call = mongoose.model('Call', callSchema)

module.exports = Call
const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    senderId: {
            type: String,
            required: true,
            trim: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['text', 'call', 'file', 'img', 'video', 'location', 'audio'],
        default: "text"
    },
    call: {
        callSuggestTime: {
            type: Date,
        },
        type: {
            type: String,
            enum: ['audio', 'video']
        },
        status: {
            type: String,
            enum: ['ongoing', 'missed', 'cancelled', 'accepted']
        },
        duration: {
            type: Number
        }
    },
    reciever: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Room'
    },
    text: {
        type: String,
        trim: true
    },
    video: {
        type: String
    },
    audio: {
        type: String
    },
    file: {
        type: String
    },
    location: {
        type: String
    }
}, {
    timestamps: true
})

const Message = mongoose.model('Message', messageSchema)

module.exports = Message
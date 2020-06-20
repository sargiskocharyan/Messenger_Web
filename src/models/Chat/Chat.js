const mongoose = require('mongoose')

const chatSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Room'
    },
    safe: {
        type: Boolean,
        required: true,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    ownerOther: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
},
{
    timestamps: true
})

const Chat = mongoose.model('Chat', chatSchema)

module.exports = Chat
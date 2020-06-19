const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    sender: {
        id: {
            type: String,
            required: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
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
        trim: true,
        required: true
    }
}, {
    timestamps: true
})

const Message = mongoose.model('Message', messageSchema)

module.exports = Message
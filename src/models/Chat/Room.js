const mongoose = require('mongoose')

const Message = require('./Message')

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
        trim: true,
    },
    safe: {
        type: Boolean,
        required: true,
        default: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    ownerOther: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
})

roomSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: "owner"
})

roomSchema.methods.getLastMassage = async function() {
    const room = this
    const message = await Message.find({owner: room._id}).sort({createdAt: -1})
    return message.length > 0 ? message[0] : null
}

const Room = mongoose.model('Room', roomSchema)

module.exports = Room
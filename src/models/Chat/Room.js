const mongoose = require('mongoose')

const Message = require('./Message')

const roomSchema = new mongoose.Schema({
    safe: {
        type: Boolean,
        required: true,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    messages: [{
        message: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'messages'
        }
    }]
}, {
    timestamps: true
})

roomSchema.virtual('messagesVirt', {
    ref: 'Message',
    localField: '_id',
    foreignField: "owner"
})//???

roomSchema.methods.getLastMassage = async function() {
    //const start = new Date();
    const room = this
    const message = await Message.find({owner: room._id}).sort({createdAt: -1})
    //console.log(message)
    //const end = new Date();
    //console.log(`getLastMessage - ${(end - start)/1000}`)
    return message.length > 0 ? message[0] : null
}

const Room = mongoose.model('Room', roomSchema)

module.exports = Room
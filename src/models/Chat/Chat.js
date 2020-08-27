const mongoose = require('mongoose')
const Message = require('./Message')

const chatSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true
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
    },
    messages: [{
        message: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message'//'messages'
        }
    }],
    statuses: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        receivedMessageDate: {
            type: Date,
            default: Date.now
        },
        readMessageDate: {
            type: Date,
            default: Date.now
        }
    }]
},
{
    timestamps: true
})

chatSchema.virtual('messagesVirt', {
    ref: 'Message',
    localField: '_id',
    foreignField: "owner"
})

chatSchema.methods.getLastMassage = async function() {
    //const start = new Date();
    const chat = this;
    const messages = chat.messages;
    if (messages && messages.length > 0) {
        try {
            const message = await Message.findById(messages[messages.length -1].message);
            return message
        } catch (e) {
            console.log(e)
            return null
        }
    } else {
        return null
    }
}

chatSchema.methods.updateStatuses = async function(userId, message, type) {
    const chat = this;
    let updated = false;
    try {
        
        chat.statuses.forEach(async (element) => {
            if (element.userId == userId && element[type] < message.createdAt)  {
                element[type] = message.createdAt;
                if (type == 'readMessageDate' && element['readMessageDate'] > element['receivedMessageDate']) {
                    element['receivedMessageDate'] = message.createdAt;
                }
                await chat.save()
                updated = true;
            }
        });
        return updated;
    } catch(e) {
        console.log(`Chat updateStatuses : Error : ${e.message}`);
        return updated;
    }
    
}

const Chat = mongoose.model('Chat', chatSchema)

module.exports = Chat
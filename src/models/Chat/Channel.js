const mongoose = require('mongoose')

const channelSchema = new mongoose.Schema({
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
    admins: [{
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    }],
    subscribers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    }],
    blockedUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    }]
},
{
    timestamps: true
})


const Channel = mongoose.model('Channel', channelSchema)

module.exports = Channel
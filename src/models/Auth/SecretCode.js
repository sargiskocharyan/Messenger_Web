const mongoose = require('mongoose')

const codeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    temporaryUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TemporaryUser'
    },
    expireAt: {
            type: Date,
            default: Date.now,
            index: { expires: process.env.SECRETCODE_EXPIRATION_TIME }
        }
}, {
    timestamps: true
})

const SecretCode = mongoose.model('SecretCode', codeSchema)

module.exports = SecretCode
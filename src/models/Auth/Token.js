const mongoose = require('mongoose')

const tokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    expireAt: {
            type: Date,
            default: Date.now,
            index: { expires: process.env.TOKEN_EXPIRATION_TIME }
        }
}, {
    timestamps: true
})

// tokenSchema.methods.toJSON = function () {
//     const token = this
//     const tokenObject = token.toObject()
//     delete tokenObject.owner
//     delete tokenObject.expireAt

//     return tokenObject
// }

const Token = mongoose.model('Token', tokenSchema)

module.exports = Token
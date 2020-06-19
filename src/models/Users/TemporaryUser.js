const mongoose = require('mongoose')
const validator = require('validator')
const cryptoRandomString = require('crypto-random-string')
const SecretCode = require('../Auth/SecretCode')

const temporaryUserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid.')
            }
        }
    }
}, {
    timestamps: true
})

temporaryUserSchema.virtual('secretCodes', {
    ref: 'SecretCode',
    localField: '_id',
    foreignField: 'temporaryUser'
})

temporaryUserSchema.methods.generateSecretCode = async function () {
    const tempUser = this
    const code = cryptoRandomString({length: 4, type: 'numeric'});;
    const secretCode = new SecretCode({code, temporaryUser: tempUser._id})
    await secretCode.save()

    return code
}

const TemporaryUser = mongoose.model('TemporaryUser', temporaryUserSchema)

module.exports = TemporaryUser
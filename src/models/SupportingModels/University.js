const mongoose = require('mongoose')

const universitySchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    nameRU: {
        type: String,
        unique: true,
        required: true
    },
    nameEN: {
        type: String,
        unique: true,
        required: true
    },
    city: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'City'
    }
}, {
    timestamps: true
})

universitySchema.methods.toJSON = function () {
    const univer = this
    const univerObject = univer.toObject()

    delete univerObject.__v
    delete univerObject.createdAt
    delete univerObject.updatedAt

    return univerObject
}

const University = mongoose.model('University', universitySchema)

module.exports = University
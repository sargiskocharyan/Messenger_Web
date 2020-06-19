const mongoose = require('mongoose')

const citySchema = new mongoose.Schema({
    nameAM: {
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
    }
}, {
    timestamps: true
})

const City = mongoose.model('City', citySchema)

module.exports = City
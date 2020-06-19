const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const passwordSchema = new mongoose.Schema({
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true,
        validate(value) {
            if (value.toLowerCase().includes("password")) {
                throw new Error("Password cannot contain 'password'.")
            }
        }
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
})
//Hash the plain text password before saving
passwordSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

const Password = mongoose.model('Password', passwordSchema)

module.exports = Password
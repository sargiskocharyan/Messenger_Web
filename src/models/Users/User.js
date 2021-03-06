const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cryptoRandomString = require('crypto-random-string')
const Token = require('../Auth/Token')
const Room = require('../Chat/Room')
const SecretCode = require('../Auth/SecretCode')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        validate(value) {
            if (!validator.isAlpha(value) || value.length < 2) {
                throw new Error('Name is invalid.')
            }
        }
    },
    lastname: {
        type: String,
        trim: true,
        validate(value) {
            if (!validator.isAlpha(value) || value.length < 2) {
                throw new Error('Lastname is invalid.')
            }
        }
    },
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
    },
    username: {
        type: String,
        unique: true
    },
    university: {
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'University'
    },
    // age: {
    //     type: Number,
    //     default: 0,
    //     validate(value) {
    //         if(value < 0) {
    //             throw new Error('Age must be a positive number!')
    //         }
    //     }
    // },
    contacts: [{
        contact: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            //unique: true,
            ref: 'User'
        }
    }],
    groups: [{
        group: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Group'
        }
    }],
    channels : [{
        channel: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Channel'
        }
    }],
    userRoom: {
            type: String,
            required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        required: true,
        default: "user"
    },
    blockedUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    }],
    avatar: {
        type: Buffer
    },
    blocked: {
        type: Boolean,
        required: true,
        default: false
    }
}, {
    timestamps: true
})

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()
    delete userObject.avatar
    delete userObject.blockedUsers
    delete userObject.contacts
    delete userObject.groups
    delete userObject.channels
    delete userObject.userRoom
    delete userObject.role
    delete userObject.__v
    delete userObject.createdAt
    delete userObject.updatedAt
    if (userObject.university) {
        delete userObject.university.__v
        delete userObject.university.createdAt
        delete userObject.university.updatedAt
    }

    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this
    const tokenString = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET)
    const token = new Token({token: tokenString, owner: user._id})
    await token.save()

    return token.token
}//+

userSchema.methods.generateSecretCode = async function () {
    const user = this
    const code = cryptoRandomString({length: 4, type: 'numeric'});;
    const secretCode = new SecretCode({code, user: user._id})
    await secretCode.save()

    return code
}//+

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({email})
    if (!user) {
        throw new Error('Unable to login')
    } else if (user.role == "user") {
        await user.populate({
            path: 'secretCodes',
            match: {code: password}
        }).execPopulate()
        if (user.secretCodes.length < 1) {
            throw new Error("Email or code not valid!")
        }
    } else {
        await user.populate({path: 'password'}).execPopulate()
        const isMatch = await bcrypt.compare(password, user.password[0].password)
        if (!isMatch) {
            throw new Error('Unable to login')
        }
    }
    
    return user
}

userSchema.virtual('password', {
    ref: 'Password',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.virtual('tokens', {
    ref: 'Token',
    localField: '_id',
    foreignField: 'owner'
})//+
userSchema.virtual('secretCodes', {
    ref: 'SecretCode',
    localField: '_id',
    foreignField: 'user'
})//+
//Delete user tokens when user is removed
userSchema.pre('remove', async function (next) {
    const user = this
    await Token.deleteMany({ owner: user._id })

    next()
})//+


userSchema.virtual('rooms', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'owner'
})
userSchema.virtual('rooms2', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'ownerOther'
})

//Delete user rooms when user is removed - change -> delate
userSchema.pre('remove', async function (next) {
    const user = this
    await Room.deleteMany({ owner: user._id })

    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User
const User = require('../models/Users/User')

const moderatorAuth = async (req, res, next) => {
    try {
        if (req.user.role == 'user') {
            throw new Error('You have not permissions!')
        }
        next()
    } catch (e) {
        res.status(401).send({Error: e.message})
    }
}

module.exports = moderatorAuth
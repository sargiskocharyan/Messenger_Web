const User = require('../models/Users/User')

const adminAuth = async (req, res, next) => {
    try {
        if (req.user.role != 'admin') {
            throw new Error('You have not permissions!')
        }
            next()
    } catch (e) {
        res.status(401).send({Error: e.toString()})
    }
}

module.exports = adminAuth
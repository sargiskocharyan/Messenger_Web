const User = require('../models/Users/User')

const adminAuth = async (req, res, next) => {
    //console.log(`adminAuth - hasav`)
    try {
        if (req.user.role != 'admin') {
            throw new Error('You have not permissions!')
        }
            next()
    } catch (e) {
        console.log('sww2')
        res.status(401).send({Error: e.toString()})
    }
}

module.exports = adminAuth
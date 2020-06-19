const jwt = require('jsonwebtoken')
const User = require('../models/Users/User')

const auth = async (req, res, next) => {
    try {
        var token;
        if (req.resType == "html") {
            token = req.cookies['auth_token'].replace('Bearer ', '')
        } else {
            token = req.header('Authorization').replace('Bearer ', '')
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET) 
        const user = await User.findOne({_id: decoded._id}).orFail(new Error('Invalid token!'))
        await user.populate({
            path: 'tokens',
            match: {token}
        }).execPopulate()
        if (user.tokens.length < 1) {
            throw new Error()
        }
        req.token = user.tokens[0]
        req.user = user
        next()
    } catch (e) {
        if (req.resType == "html") {
            res.redirect('/authenticate');
        } else {
            res.status(401).send({Error: 'Please authenticate!'})
        }
    }
}

module.exports = auth
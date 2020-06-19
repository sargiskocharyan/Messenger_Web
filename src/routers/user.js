const express = require('express')
const validator = require('validator')
// const multer = require('multer')
// const sharp = require('sharp')
//const paths = require('path')
const User = require('../models/Users/User')
const TemporaryUser = require('../models/Users/TemporaryUser')
const Token = require('../models/Auth/Token')

const resType = require('../middleware/resType')
const auth = require('../middleware/auth')
const Room = require('../models/Chat/Room')
const jwt = require('jsonwebtoken')
//const Message = require('../models/message')
//const { sendWelcomeEmail, sendCancelationEmail, sendVarificationCode } = require('../emails/account')
const router = new express.Router()

router.post('/findusers', resType, auth, async (req, res) => {
    try {
        const usersArr = await User.aggregate([{
            $addFields: {
                "fullname": {
                    $concat: [ "$name", ' ', "$lastname" ]
                }
            }
        }, {
            $match: {
                "$or": [
                    {"name": new RegExp(req.body.term, 'i')},
                    {"lastname": new RegExp(req.body.term, 'i')},
                    {"fullname": new RegExp(req.body.term, 'i')},
                    {"username": new RegExp(req.body.term, 'i')}
                ]        
            }
        }])
        const usersString = JSON.stringify(usersArr, ['name', '_id', 'lastname', 'username'])
        const users = JSON.parse(usersString)
        res.send({users})

    } catch (e) {
        console.log({Error: e.toString()})
        res.status(500).send({Error: 'Server error.'})
    }
})

router.post('/addContact', resType, auth, async (req, res) => {
    try {
        const userOther = await User.findOne({_id : req.user._id.toString(), 'contacts.contact' : req.body.contactId})
        if (userOther) {
            throw new Error('Contact is already added!')
        }
        const contact = await User.findOne({_id : req.body.contactId}).orFail(new Error('Bad Request'))
        const user = req.user
        user.contacts = user.contacts.concat({contact: contact._id})
        await user.save()
        res.send()
    } catch (e) {
        console.log(e)
        res.status(400).send({Error: e.toString()})
    }
})

router.get('/contacts', resType, auth, async (req, res) => {
    try {
        const user = await req.user.populate('contacts.contact').execPopulate()
        const arr = [];
        user.contacts.forEach(element => arr.push(element.contact));//---
        res.send(arr)
    } catch (e) {
        res.status(503).send({Error: e.toString()})
    }
})

router.get('/', resType, auth, async (req, res) => {
    
    const array = []
    await req.user.populate({
        path: 'rooms'
    }).execPopulate()
    var rooms = req.user.rooms
    await req.user.populate({
        path: 'rooms2'
    }).execPopulate()
    rooms = rooms.concat(req.user.rooms2)
    var cond = true
    for (i in rooms) {
        if (rooms[i].owner == req.user._id.toString()) {
            if (rooms[i].ownerOther == req.user._id.toString() && cond){
                //do Nothing, because there are duplicate
                cond = false
            } else {
                const room = await rooms[i].populate('ownerOther').execPopulate()
                array.push({id: rooms[i].ownerOther._id.toString(), name: room.ownerOther.username})
            }
        } else {
            const room = await rooms[i].populate('owner').execPopulate()
            array.push({id: rooms[i].owner._id.toString(), name: room.owner.username})
        }
    }
    const condition = req.user.role == 'user' ? null : true;
    res.render('index.ejs', {'userName':req.user.username, 'chatsUser':array, condition})
})

router.get('/chats', resType, auth, async (req, res) => {
    const array = []
    await req.user.populate({
        path: 'rooms'
    }).execPopulate()
    var rooms = req.user.rooms
    await req.user.populate({
        path: 'rooms2'
    }).execPopulate()
    rooms = rooms.concat(req.user.rooms2)
    var cond = true
    for (i in rooms) {
        if (rooms[i].owner == req.user._id.toString()) {
            if (rooms[i].ownerOther == req.user._id.toString() && cond){
                //do Nothing, because there are duplicate
                cond = false
            } else {
                const room = await rooms[i].populate('ownerOther').execPopulate()
                const message = await room.getLastMassage()
                array.push({id: rooms[i].ownerOther._id.toString(), name: room.ownerOther.name, lastname: room.ownerOther.lastname, username: room.ownerOther.username, message})
            }
        } else {
            const room = await rooms[i].populate('owner').execPopulate()
            const message = await room.getLastMassage()
            array.push({id: rooms[i].owner._id.toString(), name: room.owner.name, lastname: room.owner.lastname, username: room.owner.username, message})
        }
    }
    res.send(array)
})

router.post('/tokenExists', async (req, res) => {
    try {
        var token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_SECRET) 
        const user = await User.findOne({_id: decoded._id}).orFail(new Error('Non valid token!'))
        await user.populate({
            path: 'tokens',
            match: {token}
        }).execPopulate()
        const tokenExists = user.tokens.length > 0
        res.status(200).send({tokenExists})
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})//+

router.post('/mailExists', async (req, res) => {
    const mail = req.body.email
    const user = await User.findOne({email: mail})
    if (user != null) {
        const code = await user.generateSecretCode()
        //sendVarificationCode(mail, code)
        return res.send({mailExist: true, code: code})
    } else {
        const tempUser = await TemporaryUser.findOne({email: mail})
        if (tempUser != null) {
            const code = await tempUser.generateSecretCode()
            //sendVarificationCode(mail, code)
            return res.send({mailExist: false, code: code})
        } else {
            const temporaryUser = new TemporaryUser({email: mail})
            try {
                await temporaryUser.save()
                const code = await temporaryUser.generateSecretCode()
                //sendVarificationCode(mail, code)
                return res.send({mailExist: false, code: code})
            } catch (e) {
                return res.status(400).send({Error: e.toString()})
            }
        }
    }
})

router.get('/temporaryusers', async (req, res) => {
    try {
        const users = await TemporaryUser.find({})
        res.send(users)
    } catch (e) {
        res.status(503).send({Error: 'Server Error'})
    }
})
//+
router.get('/authenticate', (req, res) => {
    const email = req.query.email;
    const msgErr = req.query.msgErr;
    return res.render('authenticate.ejs', {email, msgErr});
})
//+
router.post('/authenticate', async (req, res) => {
    const email = req.body.email
    console.log(email)
    try {
        if (!validator.isEmail(email)) {
            throw new Error('Email isn\'t valid!')
        }
        const user = await User.findOne({email})
        console.log(user)
        if (user != null) {
            if (user.role == 'user') {
                //const code = await user.generateSecretCode()
                //sendVarificationCode(mail, code)
            }
            return res.redirect('/login?email=' + email)
        } else {
             let tempUser = await TemporaryUser.findOne({email})
            if (tempUser == null) {
                const temporaryUser = new TemporaryUser({email})
                await temporaryUser.save()
                tempUser = temporaryUser
            }
            //const code = await tempUser.generateSecretCode()
            //sendVarificationCode(email, code)
            return res.redirect('/register?email=' + email)
        }
    } catch (e) {
        return res.redirect('/authenticate?email=' + email + '&msgErr=' + e.message)
    }
})

router.get('/login', (req, res) => {
    const email = req.query.email;
    const msgErr = req.query.msgErr;
    return res.render('login.ejs', {email, msgErr});
})

router.post('/login', resType, async (req, res) => {
    if (req.resType == "html") {
        try {
            const user = await User.findByCredentials(req.body.email, req.body.code)
            const token = await user.generateAuthToken()
            res.cookie('auth_token', token)
            res.redirect('/')
        } catch(e) {
            return res.status(400).render('login.ejs', {"email":req.body.email,"msgErr":"Not correct code!"});
        }
    } else {
        try {
            //const user = await User.findByCredentials(req.body.email, req.body.code)
            const user = await User.findOne({email: req.body.email}).orFail(new Error("Email or code not valid!"))
            await user.populate({
                    path: 'secretCodes',
                    match: {code: req.body.code}
                }).execPopulate()
            if (user.secretCodes.length > 0) {
                const token = await user.generateAuthToken()
                await user.populate({path: 'university'}).execPopulate()
                return res.send({token, user})
            } else {
                throw new Error("Email or code not valid!")
            }
        } catch(e) {
            return res.status(400).send({Error: e.toString()})
        }
    }
})//+

router.get('/register',  (req, res) => {
    const email = req.query.email;
    const msgErr = req.query.email;
    return res.render('register.ejs', {email,'name':null,'pass':null,'passConf':null, msgErr});
})//+
 
router.post('/register',resType, async (req, res) => {
    if (req.resType == "html") {
        return res.send("web not working yet")
        // const user = new User({name:req.body.username, email: req.body.email})
        // const room = new Room({name:(user._id).toString()})
        // user.userRoom = room.name
        // try {
        //     await user.save()
        //     //sendWelcomeEmail(user.email, user.name)
        //     const token = await user.generateAuthToken()
        //     //const room = new Room({name:(user._id).toString()})
        //     await room.save()
        //     res.cookie('auth_token', token)
        //     res.redirect('/')
        // } catch (e) {
        //     return res.status(400).render('register.ejs', {'email':req.body.email,'name':req.body.name,'pass':req.body.pass,'passConf':req.body.passConf,'msgErr':`Not correct data!\n${e}`})
        // }
    } else {
        try {
            console.log(req.body.email, req.body.code)
            const temporaryUser = await TemporaryUser.findOne({email: req.body.email}).orFail(new Error('Email or code not valid!'))
                await temporaryUser.populate({
                    path: 'secretCodes',
                    match: {code: req.body.code}
                }).execPopulate()
                if (temporaryUser.secretCodes.length < 1) {
                    throw new Error('Email or code not valid!')
                }
                const user = new User({email: req.body.email})
                user.username = "user@" + user._id.toString()
                const room = new Room({name:(user._id).toString()})
                user.userRoom = room.name
                await user.save()
                await temporaryUser.remove()
                const token = await user.generateAuthToken()
                await room.save()
                res.send({token, user})      
        } catch (e) {
            return res.status(400).send({Error: e.toString()})
        }
    }
})//-

router.get('/users',  async (req, res) => {
    try {
        const users = await User.find({})
        res.send(users)
    } catch (e) {
        res.status(500).send({Error: 'Server Error.'})
    }
})

router.get('/chats/:id', resType, auth, async (req, res) => {
        const id = req.params.id
        const condition = id < req.user._id.toString()
        const name = condition ? id + req.user._id.toString() : req.user._id.toString() + id
        const path = condition ?  'rooms2' : 'rooms'
        try {
            await req.user.populate({
                path,
                match: {name}
            }).execPopulate()
            const user = await User.findById(id)
            const rooms = req.user[path]
            if (rooms.length > 0) {
                await rooms[0].populate({
                    path: 'messages'
                }).execPopulate()
                res.send(rooms[0].messages)
            } else {
                let room = null
                    if (condition) {
                        room = new Room({name: id + req.user._id.toString(), owner: user._id, ownerOther: req.user._id})
                    } else {
                        room = new Room({name: req.user._id.toString() + id, owner: req.user._id, ownerOther: user._id})
                    }
                    await room.save()
                    res.send({messages: []})
            }
        } catch (e) {
            console.log(e)
            res.status(404).send({Error: e.toString()})
        }
    })

// router.post('/users', async (req, res) => {
//     const user = new User(req.body)

//     try {
//         await user.save()
//         // sendWelcomeEmail(user.email, user.name)
//         const token = await user.generateAuthToken()
//         res.cookie('auth_token', token)
//         res.sendFile(paths.resolve(__dirname, '..', 'views', 'private.html'))
//         //res.status(201).send({user, token})
//     } catch (e) {
//         res.status(400).send(e)
//     }
// })



router.post('/user/logout', auth, async (req, res) => {
    try {
        await req.token.remove()
        res.send()
    } catch (e) {
        res.status(500).send({Error: e.toString()})
    }
})

router.post('/users/logoutAll', resType, auth, async (req, res) => {
    try {
        const resp = await Token.deleteMany({owner: req.user._id})
        res.send(resp)
    } catch (e) {
        res.status(500).send({Error: e.toString()})
    }
})



// router.get('/users/me', auth, async (req, res) => {
//     res.send(req.user)
// })

router.post('/updateuser', resType, auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'username', 'lastname', 'university']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    if (!isValidOperation) {
        return res.status(400).send({Error: 'Invalid updates!'})
    }
    if (req.body.username) {
        if (!validator.matches(req.body.username, /^[a-zA-Z0-9](_(?!(\.|_|-))|\.(?!(_|-|\.))|-(?!(\.|_|-))|[a-zA-Z0-9]){6,18}[a-zA-Z0-9]$/)) {
            return res.status(400).send({Error: 'Incorrect username!'})
        }
    }
    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        await req.user.populate({path: 'university'}).execPopulate()

        res.send(req.user)
    } catch (e) {
        res.status(500).send({Error: e.toString()})
    }
})

// router.delete('/users/me', auth,  async (req, res) => {
//     try {
//         await req.user.remove()
//         sendCancelationEmail(req.user.email, req.user.name)
//         res.send(req.user)
//     } catch (e) {
//         res.status(500).send()
//     }
// })

// const upload = multer({
//     limits: {
//         fileSize: 1000000
//     },
//     fileFilter(req, file, cb) {
//             if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
//             return cb(new Error('Please upload an jpg, jpeg or png image!'))
//         }
//         cb(undefined, true)
//     }
// })

// router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
//     const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250 }).png().toBuffer()
//     req.user.avatar = buffer
//     await req.user.save()
//     res.send()
// }, (error, req, res, next) => {
//     res.status(400).send({error: error.message})
// })

// router.delete('/users/me/avatar', auth, async (req, res) => {
//     req.user.avatar = undefined
//     await req.user.save()
//     res.send()
// })

// router.get('/users/:id/avatar', async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id)

//         if (!user || !user.avatar) {
//             throw new Error()
//         }

//         res.set('Content-Type', 'image/png')
//         res.send(user.avatar)
//     } catch (e) {
//         res.status(404).send()
//     }
// })

module.exports = router
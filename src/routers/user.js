const express = require('express');
const validator = require('validator');
const multer = require('multer');
const sharp = require('sharp');
const cryptoRandomString = require('crypto-random-string');
const fs = require('fs');
const paths = require('path');
const onlineUsers = require('../utils/onlineUsers')

const User = require('../models/Users/User')
const TemporaryUser = require('../models/Users/TemporaryUser')
const Token = require('../models/Auth/Token')

const {uploadFile, deleteFile} = require('../utils/gcloud')

const resType = require('../middleware/resType')
const auth = require('../middleware/auth')
const Chat = require('../models/Chat/Chat')
const Call = require('../models/Calls/Call')
const Device = require('../models/PushServer/Device')
const deviceManager = require('../utils/deviceManager')
//onst Room = require('../models/Chat/Room')
const jwt = require('jsonwebtoken')
//const Message = require('../models/message')
//const { sendWelcomeEmail, sendCancelationEmail, sendVarificationCode } = require('../emails/account')
const router = new express.Router()

router.post('/readcallhistory', resType, auth, async (req, res) => {
    try {
        console.log(`/readcallhistory : ${req.user.email} : ${req.body.callId}`)
        const user = req.user;
        const callId = req.body.callId;
        const callIndex = user.missedCallHistory.findIndex(item => item == callId);
        if (callIndex != -1) {
            console.log(callIndex)
            user.missedCallHistory.splice(0, callIndex + 1);
            deviceManager.sendPushNotification(user._id.toString(), 'message', {
                type: 'missedCallHistory',
                username: user.username,
                image: user.avatar ? user.avatar.avatarURL : null,
                badge: user.missedCallHistory.length,
                missedCall: user.missedCallHistory
            });
            await user.save()
        } else {
            throw new Error('Incorrect call id.');
        }
        res.send()
    } catch (e) {
        console.log(e);
        res.status(400).send({Error: e.message})
    }
})

router.post('/registerdevice', resType, auth, async (req, res) => {
    try {
        console.log(`/registerdevice : ${req.body.deviceUUID}, ${req.body.token}, ${req.body.voIPToken}`)
        let device = await Device.findOne({deviceUUID: req.body.deviceUUID})
        if (!device) {
            device = new Device({deviceUUID: req.body.deviceUUID, deviceId: req.body.token, deviceIdVoIP: req.body.voIPToken,
                platform: req.body.platform, userId: req.user._id});
        } else {
            device.deviceId = req.body.token;
            device.deviceIdVoIP= req.body.voIPToken;
            device.userId = req.user._id;
        }
        await device.save()
        console.log(`/registerdevice : ${device}`)
        res.send(device)
    } catch (e) {
        console.log(`/registerdevice :${e.message}`)
        res.status(400).send({Error: e.message})
    }
})

router.post('/sendpushnotification', resType, auth, async (req, res) => {
    const userToSend = await User.findById(req.body.userId);
    console.log(`/sendpushnotification : userId : ${JSON.stringify(req.body)}`)
    //console.log(`/sendpushnotification : ${userToSend ? userToSend.email: 'not found user'}`);
    //Sargis,iOS : "1ad6c7f860c3d5ac4c97404da4f6acf2784f03354492f45615992b50c72361fc"
    //const newDevice = new Device({deviceId: "cHaDplI_QgGsGwFXss5B4H:APA91bEc322rFe0yz1UQy7oPncAFcN_TvBEji12Onr36jKTzuv2cyNfu38ggBfhxaGZySj4Go6TDN8vh4wprMIucS9buXlk5xKnnwTZmxjGKCVzyybNsnfFdJ_oDcnrwyh0GxdujxIIt", 
    //platform: "android", userId: req.user._id});
    //"This is an FCM notification that displays an image.!"
    deviceManager.sendPushNotification(req.body.userId, 'message', {type:'message', message: 'Push notification body.', title: 'Title of push notification.', username: req.user.username, image: req.user.avatar ? req.user.avatar.avatarURL : null})
    //await newDevice.save();
    //newDevice.sendPushNotification(req.user.email, `You have missed call from ${req.user.username}`);
    res.send('Push notification');
    // const devicesToSend = await Device.find({userId: req.body.userId})
    // if (devicesToSend && devicesToSend.length > 0) {
    //     devicesToSend.forEach((device) => {
    //         device.sendPushNotification(req.user.email)
    //     })
    //     res.send('Push notification Sended.')
    // } else (
    //     res.status(400).send({Error: 'Can\'t send Push notification to specified user!'})
    // )
})


router.post('/onlineusers', resType, auth, (req, res) => {
    console.log(`onlineUsers : ${req.user.email} \n${JSON.stringify(req.body)}`)
    const arrayOfUsers = req.body.usersArray;
    const usersOnline = new Set();
    try {
        if (arrayOfUsers) {
            arrayOfUsers.forEach((id) => {
                if (onlineUsers.findUser(id)) {
                    usersOnline.add(id);
                }
            })
            res.send({usersOnline: [...usersOnline]});
        } else {
            throw new Error('Bad request.');
        }
    } catch(e) {
        console.log(`/onlineUsers : error -> ${e.message}`)
        res.status(400).send({Error: 'Bad request.'})
    }
    
})

router.get('/peer', resType, auth, (req, res) => {
    return res.render('peer.ejs')
})//delete

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
                "$and": [
                    {"deactivated": false},
                    {
                        "$or": [
                            {"name": new RegExp(req.body.term, 'i')},
                            {"lastname": new RegExp(req.body.term, 'i')},
                            {"fullname": new RegExp(req.body.term, 'i')},
                            {"username": new RegExp(req.body.term, 'i')},
                            {"email": new RegExp(req.body.term, 'i')}
                        ]    
                    }
                ]
                    
            }
        }])
        const users = usersArr.map(
            obj => {
                return {
                    "name" : obj.name,
                    "_id":obj._id,
                    "lastname":obj.lastname,
                    "username":obj.username,
                    "avatarURL":obj.avatar? obj.avatar.avatarURL : undefined
                }
            }
        );//added
        res.send({users})

    } catch (e) {
        console.log({Error: e.toString()})
        res.status(500).send({Error: 'Server error.'})
    }
})

router.post('/addContact', resType, auth, async (req, res) => {
    try {
        console.log(`/addContact : ${req.user.email} : ${req.body.contactId}`)
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

router.post('/removecontact', resType, auth, async (req, res) => {
    try {
        console.log(`/removecontact : ${req.user.email} : ${req.body.userId}`)
        if (!req.user.contacts || req.user.contacts.length < 1) {
            throw new Error('User have no contacts!')
        }
        const contacts = req.user.contacts.filter((item) => {return item.contact != req.body.userId});
        req.user.contacts = contacts;
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(400).send({Error: e.message})
    }
})

router.post('/hidedata', resType, auth, async (req, res) => {
    console.log(`/hidedata : ${req.body}`)
    try {
        if (req.body.hide == true || req.body.hide == false) {
            if (req.user.hideData != req.body.hide) {
                req.user.hideData = req.body.hide
                await req.user.save()
            }
            res.status(200).send()
        } else {
            throw new Error("Bad request!")
        }
    } catch (e) {
        res.status(400).send({Error: e.message})
    }
})//continue

router.get('/contacts', resType, auth, async (req, res) => {
    try {
        const user = await req.user.populate('contacts.contact').execPopulate()
        const arr = [];
        user.contacts.forEach(element => {if (element.contact.deactivated != true) { 
            if (element.contact.hideData == true) { 
                arr.push({deactivated:false,_id:element.contact._id,username:element.contact.username,name:element.contact.name,lastname:element.contact.lastname,avatarURL:element.contact.avatar.avatarURL})
            } else {arr.push(element.contact)}}
        });//hide data == true : ???
        //console.log(`${user.email} : contacts -> ${arr}`)
        res.send(arr)
    } catch (e) {
        res.status(503).send({Error: e.toString()})
    }
})

router.get('/', resType, auth, async (req, res) => {
    
    const array = []
    await req.user.populate({
        path: 'chats'
    }).execPopulate()
    var chats = req.user.chats
    await req.user.populate({
        path: 'chats2'
    }).execPopulate()
    chats = chats.concat(req.user.chats2)
    var cond = true
    for (i in chats) {
        if (chats[i].owner == req.user._id.toString()) {
            if (chats[i].ownerOther == req.user._id.toString() && cond){
                //do Nothing, because there are duplicate
                cond = false
            } else {
                const chat = await chats[i].populate('ownerOther').execPopulate()
                if (chat.ownerOther) {
                    array.push({id: chat.ownerOther._id.toString(), name: chat.ownerOther.username})
                }
                
            }
        } else {
            const chat = await chats[i].populate('owner').execPopulate()
            if (chat.owner) {
                array.push({id: chat.owner._id.toString(), name: chat.owner.username})
            }
        }
    }
    const condition = req.user.role == 'user' ? null : true;
    res.render('index.ejs', {'userName':req.user.username, 'chatsUser':array, condition})
})

router.get('/chats', resType, auth, async (req, res) => {
    //console.time('chats_all');
    //console.time('chats_firstPart');
    console.log(`////chats: ${req.user.email}`);
    const array = [];
    /*await req.user.populate({
        path: 'chats'
    }).execPopulate()
    await req.user.populate({
        path: 'chats2'
    }).execPopulate()*///change
    await Promise.all([req.user.populate({
        path: 'chats'
    }).execPopulate(),req.user.populate({
        path: 'chats2'
    }).execPopulate()]);
    var chats = req.user.chats;
    chats = chats.concat(req.user.chats2);
    var cond = true;
    var badge = 0;
    //console.timeEnd('chats_firstPart');
    //console.time('chatsSecondPart');
    const promises = chats.map(async chat => {
        let readMessageDate = null;
        let unreadMessageExists = false;
        if (chat.statuses) {
            chat.statuses.forEach((status) => {
                if (status.userId == req.user._id.toString()) {
                    readMessageDate = status.readMessageDate
                    //console.log(`/chats : readMessageDate : ${readMessageDate}`)
                }
            })
        }
        if (chat.owner == req.user._id.toString()) {
            //const a1 = new Date();
            if (chat.ownerOther == req.user._id.toString() && cond){
                //do Nothing, because they are duplicate
                cond = false;
            } else {
                const idOther = chat.ownerOther
                const [message, _] = await Promise.all([chat.getLastMassage(), chat.populate('ownerOther').execPopulate()]);
                if (message && message.senderId != req.user._id.toString() && message.createdAt > readMessageDate) {
                    badge += 1;
                    unreadMessageExists = true;
                }
                if (chat.ownerOther == null || chat.ownerOther.deactivated == true) {
                    array.push({id: idOther, message, chatCreateDay: chat.createdAt, unreadMessageExists, statuses: chat.statuses})
                } else {
                    array.push({id: idOther, name: chat.ownerOther.name, lastname: chat.ownerOther.lastname, username: chat.ownerOther.username, 
                        message, recipientAvatarURL: chat.ownerOther.avatar ? chat.ownerOther.avatar.avatarURL: null, 
                        chatCreateDay: chat.createdAt, online: onlineUsers.findUser(idOther.toString()), unreadMessageExists, statuses: chat.statuses})
                }
                //array.push({id: chat.ownerOther, message, chatCreateDay: chat.createdAt});//del
            }
            //const a2 = new Date();
            //console.log(`a1 - ${(a2 - a1)/1000}`)
        } else {
            //const a1 = new Date();
            const idOther = chat.owner
            const [message, _ ] = await Promise.all([chat.getLastMassage(), chat.populate('owner').execPopulate()]);
            if (message && message.senderId != req.user._id.toString() && message.createdAt > readMessageDate) {
                badge += 1;
                unreadMessageExists = true;
            }
            if (chat.owner == null || chat.owner.deactivated == true) {
                array.push({id: idOther, message, chatCreateDay: chat.createdAt, unreadMessageExists, statuses: chat.statuses})
            } else {
                array.push({id: idOther, name: chat.owner.name, lastname: chat.owner.lastname, username: chat.owner.username, 
                    message, recipientAvatarURL: chat.owner.avatar? chat.owner.avatar.avatarURL : null, 
                    chatCreateDay: chat.createdAt, online: onlineUsers.findUser(idOther.toString()), unreadMessageExists, statuses: chat.statuses})
            }
            //array.push({id: chat.ownerOther, message, chatCreateDay: chat.createdAt});//del
            //const a2 = new Date();
            //console.log(`b1 - ${(a2 - a1)/1000}`)
        }
    })
    await Promise.all(promises);
    //console.timeEnd('chatsSecondPart');
    //console.timeEnd('chats_all');
    console.log(`badge : ${badge}`);
    //res.send(array)
    res.send({array, badge})
})

router.get('/callhistory', resType, auth, async (req, res) => {
    try {
        console.log(`/callhistory : ${req.user.email}`)
        const arrCalls = await Call.find({'participants':req.user._id.toString()});
        res.send(arrCalls);
    } catch (e) {
        res.status(400).send({Error: e.message});
    }
})

router.delete('/call', resType, auth, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const call = await Call.findOne({_id:req.body.callId, 'participants':userId}).orFail(new Error('You already are not in this Call.'));
        call.participants = call.participants.filter(item => item != userId);
        console.log(call)
        await call.save()
        res.send()
    } catch (e) {
        res.status(400).send({Error: e.message})
    }
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
    if (!mail) {
        res.status(400).send({Error: "Mail is required!"})
    } else {
        const user = await User.findOne({email: mail})
        if (user != null) {
            const code = await user.generateSecretCode('login')
            //sendVarificationCode(mail, code)
            return res.send({mailExist: true, code: code})
        } else {
            const tempUser = await TemporaryUser.findOne({email: mail})
            if (tempUser != null) {
                const code = await tempUser.generateSecretCode('register')
                //sendVarificationCode(mail, code)
                return res.send({mailExist: false, code: code})
            } else {
                const temporaryUser = new TemporaryUser({email: mail})
                try {
                    await temporaryUser.save()
                    const code = await temporaryUser.generateSecretCode('register')
                    //sendVarificationCode(mail, code)
                    return res.send({mailExist: false, code: code})
                } catch (e) {
                    return res.status(400).send({Error: e.toString()})
                }
            }
        }
    }
})

router.post('/usernameExists', resType, auth, async (req, res) => {
    console.log(`/username ${req.user.email} : ${req.body.username}`)
    const username = req.body.username;
    const user = await User.findOne({username: {'$regex' : `^${username}$`, '$options' : 'i'}})
    res.send({usernameExists: user != null})
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
        //console.log(user)
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
            if (user.deactivated == true) {
                user.deactivated = false;
                await user.save()
            }
            res.cookie('auth_token', token.token)
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
                    match: {code: req.body.code, type: 'login'}
                }).execPopulate()
            if (user.secretCodes.length > 0) {
                await Promise.all([user.secretCodes[0].remove(), user.populate({path: 'university'}).execPopulate()])
                //await user.populate({path: 'university'}).execPopulate()
                
                if (user.deactivated == true) {
                    user.deactivated = false;
                    await user.save()
                }
                const tokenGenerated = await user.generateAuthToken()
                return res.send({token:tokenGenerated.token, tokenExpire:tokenGenerated.expireAt, user})  
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
                    match: {code: req.body.code, type: 'register'}
                }).execPopulate()
                if (temporaryUser.secretCodes.length < 1) {
                    throw new Error('Email or code not valid!')
                }
                const code = temporaryUser.secretCodes[0];
                const user = new User({email: req.body.email})
                var uniqueUsername = true 
                var randomString = cryptoRandomString({length: 6});
                while (uniqueUsername) {
                    const userExists = await User.findOne({username: `user@${randomString}`})
                    if (userExists == null) {
                        user.username = "user@" + randomString
                        uniqueUsername = false
                    } else {
                        randomString = cryptoRandomString({length: 6});
                    }
                }
                //const room = new Room({name:(user._id).toString()})
                user.userRoom = user._id.toString()
                await Promise.all([user.save(), temporaryUser.remove(), code.remove()])//poxaca
                const tokenGenerated = await user.generateAuthToken()
                res.send({token:tokenGenerated.token, tokenExpire:tokenGenerated.expireAt, user})      
        } catch (e) {
            return res.status(400).send({Error: e.toString()})
        }
    }
})//-

router.get('/users',  async (req, res) => {
    try {
        console.time('find_users')
        const users = await User.find({})
        console.timeEnd('find_users')
        res.send(users)
    } catch (e) {
        res.status(500).send({Error: 'Server Error.'})
    }
})

router.get('/chats/:id', resType, auth, async (req, res) => {
        const id = req.params.id
        const condition = id < req.user._id.toString()
        const name = condition ? id + req.user._id.toString() : req.user._id.toString() + id
        const path = condition ?  'chats2' : 'chats'
        try {
            await req.user.populate({
                path,
                match: {name}
            }).execPopulate();
            const user = await User.findById(id).orFail(new Error('Id not valid!'))
            const chats = req.user[path]
            if (chats.length > 0) {
                // await chats[0].populate('room').execPopulate()
                // const room = chats[0].room
                await chats[0].populate({
                    path: 'messagesVirt',
                    options: { sort: {'createdAt': -1}, limit: 20 }//??
                }).execPopulate();
                res.send({array:chats[0].messagesVirt.reverse(), statuses: chats[0].statuses})//add count!! max 20 messages
            } else {
                //let room = new Room();
                let chat = null;
                if (condition) {
                    chat = new Chat({name: id + req.user._id.toString(), owner: user._id, ownerOther: req.user._id, statuses:[{userId: req.user._id.toString()}, {userId: id}]});
                } else {
                    chat = new Chat({name: req.user._id.toString() + id, owner: req.user._id, ownerOther: user._id, statuses:[{userId: req.user._id.toString()}, {userId: id}]});
                }
                //room.owner = chat._id
                await chat.save()
                //await room.save()
                const emptyArray = [];
                res.send({array:emptyArray, statuses: chat.statuses})
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



router.post('/user/logout', resType, auth, async (req, res) => {
    try {
        if (req.body.deviceUUID) {
            console.log(`${req.user.email} : ${req.body.deviceUUID}`)//
            const [device, _] = await Promise.all([Device.findOne({deviceUUID: req.body.deviceUUID, userId: req.user._id.toString()}), req.token.remove()]);
            if (device) {
                console.log(`deleting : device ${req.user.email}`)
                await device.remove();
            }
        } else {
            await req.token.remove();
        }
        console.log(`/user/logout : ${req.user.email}`);
        if (req.resType == "html") {
            console.log(req.user.name)
            res.redirect('/authenticate')
        }  else {
            res.send()
        }
    } catch (e) {
        res.status(500).send({Error: e.toString()})
    }
})

router.post('/users/logoutAll', resType, auth, async (req, res) => {
    try {
        const [resp1, resp2 ]= await Promise.all([Token.deleteMany({owner: req.user._id}), Device.deleteMany({userId:req.user._id.toString()})]);
        res.send(resp1, resp2)
    } catch (e) {
        res.status(500).send({Error: e.toString()})
    }
})



// router.get('/users/me', auth, async (req, res) => {
//     res.send(req.user)
// })

router.post('/updateuser', resType, auth, async (req, res) => {
    //console.log(req.user)
    console.log(`updateUser: ${req.user.username} : ${JSON.stringify(req.body)}`)
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'username', 'lastname', 'university', 'gender', 'birthday', 'address', 'info']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    if (!isValidOperation) {
        return res.status(400).send({Error: 'Invalid updates!'})
    }
    if (req.body.username) {
        const userFinded = await User.findOne({username: {'$regex' : `^${req.body.username}$`, '$options' : 'i'}})
        if ((userFinded && userFinded._id.toString() != req.user._id.toString()) || !validator.matches(req.body.username, /^[a-zA-Z0-9](_(?!(\.|_|-))|\.(?!(_|-|\.))|-(?!(\.|_|-))|[a-zA-Z0-9]){2,18}[a-zA-Z0-9]$/)) {
            return res.status(400).send({Error: 'Incorrect username!'})
        }
    }
    try {
        //console.log(req.body.university)
        updates.forEach((update) => req.user[update] = req.body[update])
        await Promise.all([req.user.save(), req.user.populate({path: 'university'}).execPopulate()])
        // await req.user.save()
        // await req.user.populate({path: 'university'}).execPopulate()
        //console.log(req.user)
        res.send(req.user)
    } catch (e) {
        console.log(e.message)
        res.status(500).send({Error: e.toString()})
    }
})

router.post('/updatemail', resType, auth, async (req, res) => {
    try {
        const mail = req.body.mail
        const user = await User.findOne({email: mail})
        if (user != null || !mail) {
            throw new Error('That mail is already used.')
        } else {
            const tempUser = await TemporaryUser.findOne({email: mail})
            if (tempUser != null) {
                const code = await tempUser.generateSecretCode('updateMail')
                //sendVarificationCode(mail, code)
                return res.send({mailExist: false, code: code})
            } else {
                const temporaryUser = new TemporaryUser({email: mail, userId: req.user._id.toString()})
                try {
                    await temporaryUser.save()
                    const code = await temporaryUser.generateSecretCode('updateMail')
                    //sendVarificationCode(mail, code)
                    return res.send({mailExist: false, code: code})
                } catch (e) {
                    return res.status(400).send({Error: e.toString()})
                }
            }
        }
    } catch (e) {
        res.status(400).send({Error: e.message})
    }
})
router.post('/verifyemail', resType, auth, async (req, res) => {
    try {
        const user = req.user
        console.log(`/verifyemail : ${req.body.mail}, ${req.body.code}`)
        const temporaryUser = await TemporaryUser.findOne({email: req.body.mail, userId: user._id.toString()}).orFail(new Error('Email or code not valid!'))
        await temporaryUser.populate({
            path: 'secretCodes',
            match: {code: req.body.code, type: 'updateMail'}
        }).execPopulate()
        if (temporaryUser.secretCodes.length < 1) {
            throw new Error('Email or code not valid!')
        }
        const code = temporaryUser.secretCodes[0];
        user.email = req.body.mail
        await Promise.all([user.save(), temporaryUser.remove(), code.remove()])//poxaca
        res.send({user})      
    } catch (e) {
        return res.status(400).send({Error: e.toString()})
    }
})

router.post('/updatephonenumber', resType, auth, async (req, res) => {
    try {
        const number = req.body.number
        const user = await User.findOne({phoneNumber: number})
        if (user != null) {
            throw new Error('That phone number is already used.')
        } else {
            const tempUser = await TemporaryUser.findOne({phoneNumber: number, userId:req.user._id.toString()})
            if (tempUser != null) {
                const code = await tempUser.generateSecretCode('updatePhone')
                //sendVarificationCode(mail, code)
                return res.send({phonenumberExists: false, code: code})
            } else {
                const temporaryUser = new TemporaryUser({phoneNumber: number, userId: req.user._id.toString()})
                try {
                    await temporaryUser.save()
                    const code = await temporaryUser.generateSecretCode('updatePhone');
                    //sendVarificationCode(mail, code)
                    return res.send({phonenumberExists: false, code: code})
                } catch (e) {
                    return res.status(400).send({Error: e.toString()})
                }
            }
        }
    } catch (e) {
        console.log(e)
        res.status(400).send({Error: e.message})
    }
})
router.post('/verifyphonenumber', resType, auth, async (req, res) => {
    try {
        const user = req.user
        console.log(req.body.number, req.body.code)
        const temporaryUser = await TemporaryUser.findOne({phoneNumber: req.body.number, userId: user._id.toString()}).orFail(new Error('Phone number or code not valid!'))
        await temporaryUser.populate({
            path: 'secretCodes',
            match: {code: req.body.code, type:'updatePhone'}
        }).execPopulate()
        if (temporaryUser.secretCodes.length < 1) {
            throw new Error('Phone number or code not valid!')
        }
        const code = temporaryUser.secretCodes[0];
        user.phoneNumber = req.body.number
        await Promise.all([user.save(), temporaryUser.remove(), code.remove()])//poxaca
        res.send({user})      
    } catch (e) {
        console.log(e)
        return res.status(400).send({Error: e.toString()})
    }
})

router.post('/blockuser', resType, auth, async (req, res) => {
    try {
        const userOther = await User.findOne({_id : req.user._id.toString(), 'blockedUsers.user' : req.body.userId})
        if (userOther) {
            throw new Error('User is already blocked!')
        }
        const blockingUser = await User.findOne({_id : req.body.userId}).orFail(new Error('Bad Request'));
        const user = req.user
        user.blockedUsers = user.blockedUsers.concat({user: blockingUser._id})
        await user.save()
        res.status(200).send(user.blockedUsers)
    } catch (e) {
        res.status(400).send({Error:e.message})
    }
})

router.post('/unblockuser', resType, auth, async (req, res) => {
    try {
        if (!req.user.blockedUsers) {
            throw new Error('User is already unblocked!')
        }
        const blockedUsers = req.user.blockedUsers.filter((item) => {return item.user != req.body.userId});
        req.user.blockedUsers = blockedUsers;
        await req.user.save()
        res.send(req.user.blockedUsers)
    } catch (e) {
        res.status(400).send({Error: e.message})
    }
})

router.get('/user/:id', resType, auth, async (req, res) => {
    const id = req.params.id
    try {
        const user = await User.findById(id).orFail(new Error('User Not Found'))
        if (user.deactivated == true) {
            res.status(200).send({id:user._id.toString(), deactivated: user.deactivated})
        } else if (user.hideData == true) {
            res.status(200).send({_id:user._id.toString(),username:user.username,name:user.name,lastname:user.lastname,avatarURL:user.avatar.avatarURL})
        } else {
            res.status(200).send(user)
        }
    } catch (e) {
        res.status(404).send({Error: e.message})
    }
})

router.delete('/users/me', resType, auth, async (req, res) => {
    try {
        console.log(`delete me : ${req.user.email}`)
        await req.user.remove()
        //sendCancelationEmail(req.user.email, req.user.name)
        res.send(req.user)
    } catch (e) {
        res.status(500).send({Error: e.message})
    }
})

router.post('/deactivate/me', resType, auth, async (req, res) => {
    try {
        req.user.deactivated = true;
        const [resp, user] = await Promise.all([Token.deleteMany({owner: req.user._id}),req.user.save()]);
        res.status(200).send(resp)
    } catch (e) {
        res.status(500).send({Error: e.message})
    }
})

const upload = multer({
    limits: {
        fileSize: 1000000000
    },
    fileFilter(req, file, cb) {
        //console.log(req.body)
            if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an jpg, jpeg or png image!'))
        }
        cb(undefined, true)
    }
})
//chack if file exists in fs!!!
router.post('/users/me/avatar', resType, auth, upload.single('avatar'), async (req, res, next) => {
    try {
        const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250 }).png().toBuffer()
        var code = cryptoRandomString({length: 6});
        var fileName = req.user.username + '' + code +'.png'
        if (req.user.avatar && req.user.avatar.avatarName) {
            await deleteFile(req.user.avatar.avatarName);
            while (req.user.avatar.avatarName == fileName) {
                code = cryptoRandomString({length: 6});
                fileName = req.user.username + '' + code +'.png'
            }
        }
        //var avatarURL;
        uploadFile(fileName, buffer, async function (avatarURL) { 
            console.log(avatarURL)
            req.user.avatar = {avatarURL, avatarName:fileName}
            await req.user.save();
            res.send(avatarURL)
        }).catch((e) => { throw new Error("Something went wrong")});
        
    } catch (e) {
        next(e)
    }
}, (error, req, res, next) => {
    console.log(`upload avatar : ${error}`)
    res.status(400).send({error: error.message})
})

router.delete('/users/me/avatar', resType, auth, async (req, res) => {
    try {
        const avatarName = req.user.avatar.avatarName
        if (!avatarName) {
            throw new Error("Bad request!")
        }
        // req.user.avatar.avatarURL = undefined
        // req.user.avatar.avatarName = undefined
        req.user.avatar = undefined;
        await Promise.all([req.user.save(), deleteFile(avatarName)]);
        res.send()
    } catch (e) {
        res.status(400).send({Error: e.message})
    }
    
})

/*router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)

        if (!user || !user.avatar) {
            throw new Error("There aren't avatar yet.")
        }

        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    } catch (e) {
        res.status(404).send(e.message)
    }
})*/

module.exports = router
const express = require('express')

const User = require('../models/Users/User')
const Room = require('../models/Chat/Room')
const Password = require('../models/SupportingModels/Password')
const University = require('../models/SupportingModels/University')
 
const resType = require('../middleware/resType')
const auth = require('../middleware/auth')
const adminAuth = require('../middleware/adminAuth')

const router = new express.Router()
//+adminAuth, 
router.get('/superuser/new', resType, auth, adminAuth, async (req, res) => {
    console.log('user/new1');
    try {
        const universities = await University.find({})
        console.log('user/new')
        res.render('admin/user.ejs', {action: 'Create', name: null, lastname: null, email: null, username: null, role: null, readonly: null, universities, univercity: null, id: null, msgErr: null, condition: true, nameOfUser: req.user.username})
    } catch (e) {
        console.log(e)
        res.send({Error: e.message})
    }
})
//+
router.post('/superuser/new', resType, auth, adminAuth, async (req, res) => {
    try {
        const university = await University.findOne({_id: req.body.universityId}).orFail(new Error('Id not defined!'))
        const user = new User({name: req.body.name, lastname: req.body.lastname, email: req.body.email, username: req.body.username, role: req.body.role, university: university._id})
        //const room = new Room({name:(user._id).toString()})
        const password = new Password({password: req.body.password, owner: user._id})
        user.userRoom = user._id.toString()
        //await room.save()
        await Promise.all([password.save(), user.save()])
        // await password.save()
        // await user.save()
        res.redirect('/superuser?id=' + user._id.toString())
    } catch (e) {
        res.status(400).send({Error: e.message})
    }
})
//+
router.get('/superuser', resType, auth, async (req, res) => {
    try {
        const user = await User.findOne({_id: req.query.id}).orFail(new Error('Id not defined!'))
        let userId = user._id
        let condition = true
        if (req.user.role == 'user') {
            userId = null
            condition = null
        }
        await user.populate({path: 'university'}).execPopulate()
        res.render('admin/user.ejs', {action: null, name: user.name, lastname: user.lastname, email: user.email, username: user.username, role: user.role, readonly: 'readonly', universities: null, university: user.university, id: userId, msgErr: null, condition, nameOfUser: req.user.username})
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})
//+
router.get('/superuser/edit', resType, auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findOne({_id: req.query.id}).orFail(new Error('Id not defined!'))
        await user.populate({path: 'university'}).execPopulate()
        const universities = await University.find({})
        res.render('admin/user.ejs', {action: 'Edit', name: user.name, lastname: user.lastname, email: user.email, username: user.username, role: user.role, readonly: null, universities, university: user.university, id: null, msgErr: null, condition: true, nameOfUser: req.user.username})
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})
//+
router.post('/superuser/edit', resType, auth, adminAuth, async (req, res) => {
    try {
        const user= await User.findOne({_id: req.query.id}).orFail(new Error('Not valid id!'))
        if (user.role == 'user') {
            throw new Error('Admin has not such permissions!!')
        }
        const university = await University.findOne({_id: req.body.universityId})
        user.name = req.body.name
        user.lastname = req.body.lastname
        user.username = req.body.username
        user.email = req.body.email
        user.role = req.body.role
        user.university = university._id
        await user.save()
        if (req.body.password != "") {
            await user.populate({path: 'password'}).execPopulate()
            const password = user.password
            password.password = req.body.password
            await password.save()
        }
        res.redirect('/superuser?id=' + user._id.toString())
    } catch (e) {
        res.send({Error: e.message})
    }
})
//+
router.get('/superuser/delete', resType, auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findOne({_id: req.query.id}).orFail(new Error('Not valid id!'))
        if ( user.role == 'user' || req.user._id.toString() == user._id.toString()) {
            throw new Error('Admin has not such permissions.')
        }
        await user.remove()
        res.send('Done!')
    } catch (e) {
        res.send({Error: e.message})
    }
})
//+
router.get('/superuser/all', resType, auth, async (req, res) => {
    console.log('esim inch')
    try {
        const users = await User.find({$or: [{role:'admin'},{role:'moderator'}]});
        console.log(`user/all - ${users}`)
        if (req.resType == 'json') {
            res.send(users) 
        } else {
            let condition = req.user.role == 'user' ? null : true;
            res.render('admin/userAll.ejs', {users, msgErr: null, condition, nameOfUser: req.user.username})
        }
    } catch(e) {
        res.status(503).send({Error: e.toString()})
    }
})

module.exports = router
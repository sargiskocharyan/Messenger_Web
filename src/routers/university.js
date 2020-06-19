const express = require('express')
const resType = require('../middleware/resType')
const auth = require('../middleware/auth')
const moderatorAuth = require('../middleware/moderatorAuth')
const University = require('../models/SupportingModels/University')
const City = require('../models/SupportingModels/City')

const router = new express.Router()
//+
router.get('/university/new', resType, auth, moderatorAuth, async (req, res) => {
    const cities = await City.find({})
    res.render('university/modifyUniversity.ejs', {name: null, nameRU: null, nameEN: null, cities, msgErr: null, action: 'Create', readonly: null, city: null, id: null, condition: true, nameOfUser: req.user.username})
})
//+
router.post('/university/new', resType, auth, moderatorAuth, async (req, res) => {
    try {
        const city = await City.findOne({_id: req.body.cityId}).orFail(new Error('Id not defined!'))
        const university = new University({name: req.body.name, nameRU: req.body.nameRU, nameEN: req.body.nameEN, city: city._id})
        await university.save()
        res.redirect('/university?id=' + university._id.toString())
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})
//+
router.get('/university', resType, auth, async (req, res) => {
    try {
        const university = await University.findOne({_id: req.query.id}).orFail(new Error('Id not defined!'))
        let universityId = university._id
        let condition = true
        if (req.user.role == 'user') {
            universityId = null
            condition = null
        }
        await university.populate({path: 'city'}).execPopulate()
        res.render('university/modifyUniversity.ejs', {name: university.name, nameRU: university.nameRU, nameEN: university.nameEN, cities: null, msgErr: null, action: null, readonly: 'readonly', city: university.city, id: universityId, condition, nameOfUser: req.user.username})
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})
//+
router.get('/university/edit', resType, auth, moderatorAuth, async (req, res) => {
    try {
        const university = await University.findOne({_id: req.query.id}).orFail(new Error('Id not defined!'))
        await university.populate({path: 'city'}).execPopulate()
        const cities = await City.find({})
        res.render('university/modifyUniversity.ejs', {name: university.name, nameRU: university.nameRU, nameEN: university.nameEN, cities, msgErr: null, action: 'Edit', readonly: null, city: university.city, id: null, condition: true, nameOfUser: req.user.username})
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})
//+
router.post('/university/edit', resType, auth, moderatorAuth, async (req, res) => {
    try {
        const university = await University.findOne({_id: req.query.id})
        const city = await City.findOne({_id: req.body.cityId})
        university.name = req.body.name
        university.nameRU = req.body.nameRU
        university.nameEN = req.body.nameEN
        university.city = city._id
        await university.save()
        res.redirect('/university?id=' + university._id.toString())
    } catch (e) {
        res.send({Error: e.message})
    }
})
//+
router.get('/university/delete', resType, auth, moderatorAuth, async (req, res) => {
    try {
        const university = await University.findOne({_id: req.query.id})
        await university.remove()
        res.send('Done!')
    } catch (e) {
        res.send({Error: e.message})
    }
})
//+
router.get('/university/all', resType, auth, async (req, res) => {
    try {
        const university = await University.find({})
        let condition = true
        if (req.user.role == 'user') {
            condition = null
        }
        if (req.resType == 'json') {
            res.send(university) 
        } else {
            res.render('university/universityAll.ejs', {universities: university, msgErr: null, condition, nameOfUser: req.user.username})
        }
    } catch(e) {
        res.status(503).send({Error: e.toString()})
    }
})

module.exports = router
const express = require('express')
const resType = require('../middleware/resType')
const auth = require('../middleware/auth')
const moderatorAuth = require('../middleware/moderatorAuth')
const router = new express.Router()
const City = require('../models/SupportingModels/City')

router.get('/city/new', resType, auth, moderatorAuth, async (req, res) => {
    res.render('city/city.ejs', {nameAM: null, nameRU: null, nameEN: null, msgErr: null, action: 'Create', readonly: null, id: null, condition: true, nameOfUser: req.user.username})
})

router.post('/city/new', resType, auth, moderatorAuth, async (req, res) => {
    try {
        const city = new City({nameAM: req.body.nameAM, nameRU: req.body.nameRU, nameEN: req.body.nameEN})
        await city.save()
        res.redirect('/city?id=' + city._id.toString())
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})

router.get('/city', resType, auth, async (req, res) => {
    try {
        const city = await City.findOne({_id: req.query.id}).orFail(new Error('Id not defined!'))
        let cityId = city._id
        let condition = true
        if (req.user.role == 'user') {
            cityId = null
            condition = null
        }
        res.render('city/city.ejs', {nameAM: city.nameAM, nameRU: city.nameRU, nameEN: city.nameEN, msgErr: null, action: null, readonly: 'readonly', id: cityId, condition, nameOfUser: req.user.username})
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})

router.get('/city/edit', resType, auth, moderatorAuth, async (req, res) => {
    try {
        const city = await City.findOne({_id: req.query.id})
        res.render('city/city.ejs', {nameAM: city.nameAM, nameRU: city.nameRU, nameEN: city.nameEN, msgErr: null, action: 'Edit', readonly: null, id: null, condition: true, nameOfUser: req.user.username})
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})

router.post('/city/edit', resType, auth, moderatorAuth, async (req, res) => {
    try {
        const city = await City.findOne({_id: req.query.id})
        city.nameAM = req.body.nameAM
        city.nameRU = req.body.nameRU
        city.nameEN = req.body.nameEN
        await city.save()
        res.redirect('/city?id=' + city._id.toString())
    } catch (e) {
        res.send({Error: e.message})
    }
})

router.get('/city/delete', resType, auth, moderatorAuth, async (req, res) => {
    try {
        const city = await City.findOne({_id: req.query.id})
        await city.remove()
        res.send('Done!')
    } catch (e) {
        res.send({Error: e.message})
    }
})

router.get('/city/all', resType, auth, async (req, res) => {
    try {
        const cities = await City.find({})
        if (req.resType == 'json') {
            res.send(cities) 
        } else {
            let condition = true
            if (req.user.role == 'user') {
                condition = null
            }
            res.render('city/cityAll.ejs', {cities, msgErr: null, condition, nameOfUser: req.user.username})
        }
    } catch(e) {
        res.status(503).send({Error: e.toString()})
    }
})

module.exports = router
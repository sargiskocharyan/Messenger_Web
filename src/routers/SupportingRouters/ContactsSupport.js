const express = require('express')
const resType = require('../../middleware/resType')
const auth = require('../../middleware/auth')
const router = new express.Router()
const ContactSupport = require('../../models/SupportingModels/ContactsSupportModel')
const User = require('../../models/Users/User')

router.post('/contactsupport/new', resType, auth, async (req, res) => {
    try {
        const contactsupport = new ContactSupport({owner: req.user._id})
        await contactsupport.save()
        res.send(contactsupport)
    } catch (e) {
        res.status(400).send({Error: e.toString()})
    }
})

router.get('/contactsupport/all', resType, auth, async (req, res) => {
    try {
        const contactsupport = await ContactSupport.find({})
        res.send(contactsupport) 
    } catch(e) {
        res.status(503).send({Error: e.toString()})
    }
})

router.post('/contactsupport/add', resType, auth, async (req, res) => {
    try {
        const contact = await User.findOne({_id: req.body.contactId})
        if (!contact) {
            throw Error('Not correct id!')
        }
        const user = await req.user.populate({path: 'contactsSupport'}).execPopulate()
        console.log(user.contactsSupport)
        const contSup = user.contactsSupport[0]
        await contSup.populate({path: 'contacts'}).execPopulate()
        console.log(contSup.contacts)
        contSup.contacts = contSup.contacts.concat(contact._id)
        await contSup.save()
        res.send(contSup.contacts)
    } catch(e) {
        res.status(500).send({Error: e.toString()})
    }
})

module.exports = router
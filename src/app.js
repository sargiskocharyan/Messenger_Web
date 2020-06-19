const express = require('express')
const cookieParser = require('cookie-parser')
var ejs = require('ejs');
var path = require('path');
// run db connect file
require("./db/mongoose")
require("./utils/adminDafault")
//routers
const userRouter = require('./routers/user')
const universityRouter = require('./routers/university')
const cityRouter = require('./routers/city')
const adminRouter = require('./routers/admin')
//const contactsSupportRouter = require('./routers/SupportingRouters/ContactsSupport')

const app = express()

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');	

app.use(express.static(__dirname + '/views'));
// app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(userRouter)
app.use(universityRouter)
app.use(cityRouter)
app.use(adminRouter)
//app.use(contactsSupportRouter)

module.exports = app
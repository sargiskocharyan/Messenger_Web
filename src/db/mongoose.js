const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_CONNECTION_URI,{
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
})



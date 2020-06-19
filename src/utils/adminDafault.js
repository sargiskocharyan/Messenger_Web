const City = require('../models/SupportingModels/City')
const University = require('../models/SupportingModels/University')

const User = require('../models/Users/User')
const Room = require('../models/Chat/Room')
const Password = require('../models/SupportingModels/Password')

User.findOne({role: "admin"}).then(async (user) => {
    if (!user) {
        try {
            let universityDefault = await University.findOne({nameEN: 'Not defined'})
            if (!universityDefault) {
                let cityDefault = await City.findOne({nameEN: 'Not defined'})
                if (!cityDefault) {
                    const cityNew = new City({nameAM: 'Սահմանված չէ', nameRU: 'Не определено', nameEN: 'Not defined'})
                    await cityNew.save()
                    cityDefault = cityNew
                }
                const universityNew = new University({name: 'Սահմանված չէ', nameRU: 'Не определено', nameEN: 'Not defined', city: cityDefault._id})
                await universityNew.save()
                universityDefault = universityNew
            }
            const userNew = new User({name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, username: "admin-dynamic", role: "admin", university: universityDefault._id})
            const room = new Room({name:(userNew._id).toString()})
            const password = new Password({password: process.env.ADMIN_PASSWORD, owner: userNew._id})
            userNew.userRoom = room.name
            await room.save()
            await password.save()
            await userNew.save()
            //console.log(userNew)
        } catch (e) {
            console.log("There are some problems with default admin user!")
            console.log(e)
        }
    } else {
        //console.log(user)
    }
})
const User = require('../models/Users/User')

const onlineUsers = {
    users: new Set(),
    findUser(id) {
        //console.log(`findUser: ${id} - ${this.users.has(id)}`)
        return this.users.has(id)
    },
    addUser(id) {
        this.users.add(id)
    },
    async removeUser(id) {
        this.users.delete(id);
        try {
            const user = await User.findById(id);
            //console.log(user);
            user.lastOnline = new Date()
            await user.save()
        } catch(e) {
            console.log(`onlineUsers : ${e.message}`)
        }   
    }
};

module.exports = onlineUsers
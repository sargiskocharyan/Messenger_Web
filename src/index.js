const Room = require('./models/Chat/Room')
const http = require('http')
const socketio = require('socket.io')
const jwt = require('jsonwebtoken')
const User = require('./models/Users/User')
const Message = require('./models/Chat/Message')

const generateMessage = require('./utils/messages')

//const middlewareSocket = require('socketio-wildcard')();

const app = require('./app')
const port = process.env.PORT

const server = http.createServer(app)
const io = socketio(server, {path: '/socket.io'})
//io.use(middlewareSocket)

io.on('connection', async (socket) => {
    console.log('New WebSocket connection')
    // console.log(socket)
    try {
        var condMobile = true
        var token;
        if (socket.handshake.query.token) {
            token = socket.handshake.query.token
        } else if (socket.handshake.headers.cookie) {
            condMobile = false
            socket.emit('Error', 'Not authenticated')
            arrCookie = socket.handshake.headers.cookie.match(new RegExp('(^| )' + 'auth_token' + '=([^;]+)'));
            token = arrCookie == null ? null : arrCookie[2]
        } else {
            socket.emit('Error', 'Not authenticated')
            throw new Error('Token not exists!')
        }
        // socket.conn.on('packet', function (packet) {
        //     if (packet.type === 'ping') console.log('received ping');
        // });
          
        // socket.conn.on('packetCreate', function (packet) {
        // if (packet.type === 'pong') console.log('sending pong');
        // });

        const decoded = jwt.verify(token, process.env.JWT_SECRET) 
        const user = await User.findOne({_id: decoded._id}).orFail(new Error('Invalid token!'))
        await user.populate({
            path: 'tokens',
            match: {token}
        }).execPopulate()
        if (user.tokens.length < 1) {
            throw new Error('Token not exists!')
        }
        console.log(user.email)
        if (condMobile) {
            socket.join(user.userRoom)
        } else {
            socket.on('join', (callback) => {
                socket.join(user.userRoom)
                console.log('join')
                callback()
            })
        }
        
        

        socket.on('messageTest', (message) => {
            console.log(message)
            socket.emit('message2', "Your message received!")
        })

        socket.on('sendMessage', async (message, chatId , callback = null) => {
            const name = user._id.toString() < chatId ? user._id.toString() + chatId : chatId + user._id.toString()
            const path =  user._id.toString() > chatId ?  'rooms2' : 'rooms'
                await user.populate({
                    path,
                    match: {name}
                }).execPopulate()
                //console.log(user[path])
                console.log(message)
                const messageObj = new Message({sender: {id: user._id.toString(), name: user.name}, reciever: chatId, owner: user[path][0]._id, text: message})
                await messageObj.save()
                console.log(messageObj)
                if (user._id.toString() !== chatId) {
                    const userTo = await User.findById(chatId)
                        io.to(userTo.userRoom).emit('message', messageObj)
                    //generateMessage(user._id.toString(), chatId, user.name, message)
                }
                io.to(user.userRoom).emit('message', messageObj)
                if (!condMobile) {
                    callback()
                } 
                //console.log(user.userRoom)
            //console.log(`anun: ${user.name}`)
            
        })

        // socket.on('*', (a) => {
        //     //console.log(a)
        // })

        socket.on('disconnect', () => {
            
            // console.log("disconnect!")
        })
    } catch (e) { 
        socket.disconnect()
        // console.log("Error")
        // console.log(e.message)
    }

    
})
 
server.listen(port, () => {
    console.log('Server is up on port: ' + port)
})

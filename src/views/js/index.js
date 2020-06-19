const socket = io()
//Elements
var $messageForm = null
var $messageFormInput = null
var $messageForButton = null
var $messages = null
const $allUsers = document.querySelector('#allUsers')
const $mainDiv = document.querySelector('#mainDiv')
//Tempate
const messageTemplate = document.querySelector('#message-template').innerHTML
const chatTemplate = document.querySelector('#chat-template').innerHTML
// const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
// const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

const allUsersTamplate = document.querySelector('#users-list-tamplate').innerHTML
var chatId = null

$allUsers.addEventListener('click', () => {
    console.log("request")
    fetch('/users').then((response) => {
        response.json().then((data) => {
            if (data) {
                console.log(data);
                
            } 
            const html = Mustache.render(allUsersTamplate, {
                data
            })
            $mainDiv.innerHTML = html
            chatId = null
        })
    })
})

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild
 
    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
    // Visible height
    const visibleHeight = $messages.offsetHeight
    // Height of messages container
    const containerHeight = $messages.scrollHeight
    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight
    if(Math.round(containerHeight - newMessageHeight - 1) <= Math.round(scrollOffset)){
        $messages.scrollTop = $messages.scrollHeight;
    }
}

function startChat(id) {
    console.log(`chat started! - id: ${id}`)
    fetch(`/chats/${id}`).then((response) => {
        response.json().then((data) => {
            
            chatId = id
            var html = Mustache.render(chatTemplate, {
                id
            })
            $mainDiv.innerHTML = html
            correctChat()
            if (data.length > 0) {
                for (i in data) {
                    html = Mustache.render(messageTemplate, {
                        username: data[i].sender.name,
                        message: data[i].text,
                        createdAt: moment(data[i].createdAt).format('h:mm:ss a')
                    })
                    $messages.insertAdjacentHTML('beforeend', html)
                }
                autoscroll()
            } else {
            }  
        })
    })
}

function correctChat() {
    $messageForm = document.querySelector('#message-form')
    $messageFormInput = $messageForm.querySelector('input')
    $messageForButton = $messageForm.querySelector('button')
    $messages = document.querySelector('#messages')

    $messageForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        $messageForButton.setAttribute('disabled', 'disabled')
        
        const message = event.target.elements.message.value
        
        socket.emit('sendMessage', message, chatId, (error) => {
            $messageForButton.removeAttribute('disabled')
            $messageFormInput.value = ''
            $messageFormInput.focus()
            
            if (error) {
                return console.log(error)
            }
            console.log('The message was delivered!')
        })
    })
}

socket.on('ping', () => {
    alert("ping")
})

socket.on('pong', () => {
    alert("pong")
})

socket.on('message', (message) => {
    //alert(message.createdAt)
    if (chatId == message.idSender || chatId == message.idReciever) {
        const html = Mustache.render(messageTemplate, {
            username: message.username,
            message: message.text,
            createdAt: moment(message.createdAt).format('h:mm:ss a')
        })
        $messages.insertAdjacentHTML('beforeend', html)
        autoscroll()
    } else {
        if (message.idReciever ==  chatId) {

        } else {
            alert(`New message from ${message.username}`)
        }
    }
})

socket.emit("join", (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})
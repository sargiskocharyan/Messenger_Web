const socket = io()
//Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageForButton = $messageForm.querySelector('button')
const $senLocationButton  = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

//Template
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Options
const { username, room} = Qs.parse(location.search, { ignoreQueryPrefix: true })

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

socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm:ss a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (message) => {
    console.log(message)
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm:ss a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    
    $messageForButton.setAttribute('disabled', 'disabled')
    
    const message = event.target.elements.message.value
    
    socket.emit('sendMessage', message, (error) => {
        $messageForButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()
        
        if (error) {
            return console.log(error)
        }
        console.log('The message was delivered!')
    })
})

$senLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supportd by your browser.')
    }

    $senLocationButton.setAttribute('disabled', 'disabled')
    
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $senLocationButton.removeAttribute('disabled')
            console.log('Location shared!')
        })
    })
})

socket.emit("join", { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})
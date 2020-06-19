const generateMessage = (idSender, idReciever, username, text) => {
    return {
        idSender,
        idReciever,
        username,
        text,
        createdAt: new Date().getTime()
    }
}

module.exports = generateMessage
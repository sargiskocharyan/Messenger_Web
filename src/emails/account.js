const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name) => (
    sgMail.send({
        to: email,
        from: 'derikdanielyan@gmail.com',
        subject: 'Thanks for joining in!',
        text: `Welcome to the app, ${name}. Let me know how you get along with the app.`
    })
)

const sendCancelationEmail = (email, name) => (
    sgMail.send({
        to: email,
        from : 'derikdanielyan@gmail.com',
        subject: 'Sorry to see you go!',
        text: `Goodbye, ${name}. I hope to see you back sometime soon.`
    })
)

const sendVarificationCode = (email, code) => (
    sgMail.send({
        to: email,
        from: 'erikdanielyan@gmail.com',
        subject: 'Your login code.',
        text: `Your secret code for varification is: ${code}`
    })
)

module.exports = {
    sendWelcomeEmail,
    sendCancelationEmail,
    sendVarificationCode
}
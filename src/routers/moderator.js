const auth = require('../middleware/auth')
const moderatorAuth = require('../middleware/moderatorAuth')

const router = new express.Router()

router.post('/user/block', auth, moderatorAuth, async (req, res) => {
    res.send()
})

module.exports = router
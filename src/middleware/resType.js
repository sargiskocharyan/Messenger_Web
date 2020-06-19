
const resType = async (req, res, next) => {
    if (req.headers.accept.includes('application/json')) {
        req.resType = "json"
    } else {
        req.resType = "html"
    }
    next()
}

module.exports = resType
const express = require("express")

const server = express()

server.all("/", (req, res) => {
    console.log("Bot is running!")
    res.send("Bot is running!")
})

function keepAlive() {
    server.listen(3000, () => {
        console.log("Server is ready.")
    })
}

module.exports = keepAlive
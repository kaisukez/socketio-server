const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const io = require('socket.io').listen(server)
// const io = require('socket.io')(http)

app.get('/', (req, res) => {
  return res.send('hello world!')
})

io.on('connection', socket => {
  console.log('a user connect')
})

//
server.listen(3001, () => console.log('listening on port 3001'))
// const io = require('socket.io').listen(server)

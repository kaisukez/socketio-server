const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const io = require('socket.io').listen(server)
// const io = require('socket.io')(http)

/*
playerData = {
  \socketId: {
    socket: their socket,
    username: their username,
    playerStatus: {
      \roomId: PLAYER_STATUS
    }
  }
}
*/

const playerData = {}
const rooms = {}
let roomIndexNow = 0

const ROOM_STATE = {
  WAITING_FOR_OPPONENT: 'WAITING_FOR_OPPONENT',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED'
}

const PLAYER_STATUS = {
  OWNER: 'OWNER',
  OPPONENT: 'OPPONENT',
  VIEWER: 'VIEWER',
  OUTSIDER: 'OUTSIDER'
}

const initializePlayerData = socket => {
  playerData[socket.id] = {}
  playerData[socket.id]['socket'] = socket
  playerData[socket.id]['username'] = null
  playerData[socket.id]['playerStatus'] = {}
}

const setPlayerUsername = (socketId, username) => {
  playerData[socketId]['username'] = username
}

const createRoom = socketId => {
  roomIndexNow++
  const roomId = roomIndexNow.toString(36)
  rooms[roomId] = {
    ownerSocketId: null,
    opponentSocketId: null,
    viewerSocketIds: [],
    boardState: Array(8).fill('').map(a => Array(8).fill(false)),
    roomState: ROOM_STATE.WAITING_FOR_OPPONENT
  }
  addPlayerToRoom(socketId, roomId, PLAYER_STATUS.OWNER)
  setPlayerStatus(socketId, roomId, PLAYER_STATUS.OWNER)
  return roomId
}

const joinRoomToPlay = (socketId, roomId) => {
  if (rooms[roomId]['opponentSocketId'] === null) {
    addPlayerToRoom(socketId, roomId, PLAYER_STATUS.OPPONENT)
    setPlayerStatus(socketId, roomId, PLAYER_STATUS.OPPONENT)
    return true
  }
  return false
}

const joinRoomToView = (socketId, roomId) => {
  addPlayerToRoom(socketId, roomId, PLAYER_STATUS.VIEWER)
  setPlayerStatus(socketId, roomId, PLAYER_STATUS.VIEWER)
  return true
}

const leaveRoom = (socketId, roomId) => {
  const room = rooms[roomId]
  const playerStatus = getPlayerStatus(socketId, roomId)
  if (playerStatus === PLAYER_STATUS.OWNER) {
    room['ownerSocketId'] = null
    moveFromOpponentToOwnerIfPossible(roomId)
  } else if (playerStatus === PLAYER_STATUS.OPPONENT) {
    room['opponentSocketId'] = null
  } else if (playerStatus === PLAYER_STATUS.VIEWER) {
    room['viewerSocketIds']
      .splice(room['viewerSocketIds'].indexOf(socketId), 1)
  }
  removeRoomIfPossible(roomid)
}

const moveFromOpponentToOwnerIfPossible = roomId => {
  const room = rooms[roomId]
  const { ownerSocketid, opponentSocketId } = room
  if (!ownerSocket && opponentSocketId) {
    room['ownerSocketId'] = opponentSocketId
    room['opponentSocketId'] = null
  }
}

const removeRoomIfPossible = roomId => {
  const { ownerSocketId, opponentSocketId, viewerSocketIds } = rooms[roomId]
  if (!ownerSocketId && !opponentSocketId && !viewerSocketIds.length) {
    delete rooms[roomId]
  }
}

const setPlayerStatus = (socketId, roomId, playerStatus) => {
  playerData[socketId]['playerStatus'][roomId] = playerStatus
}

const removePlayerStatus = (socketId, roomId) => {
  delete playerData[socketId]['playerStatus'][roomId]
}

const getPlayerStatus = (socketId, roomId) => {
  if (playerData[socketId]['playerStatus'][roomId]) {
    return playerData[socketid]['playerStatus'][roomId]
  }
  return PLAYER_STATUS.OUTSIDER
}

const addPlayerToRoom = (socketId, roomId, playerStatus) => {
  const room = rooms[roomId]
  if (playerStatus === PLAYER_STATUS.OWNER) {
    room['ownerSocketId'] = socketId
  } else if (playerStatus === PLAYER_STATUS.OPPONENT) {
    room['opponentSocketId'] = socketId
  } else if (playerStatus === PLAYER_STATUS.VIEWER) {
    room['viewerSocketIds'].push(socketId)
  }
}

const removePlayerFromRoom = (socketId, roomId, playerStatus) => {
  const room = rooms[roomId]
  if (playerStatus === PLAYER_STATUS.OWNER) {
    room['ownerSocketId'] = null
  } else if (playerStatus === PLAYER_STATUS.OPPONENT) {
    room['opponentSocketId'] = null
  } else if (playerStatus === PLAYER_STATUS.VIEWER) {
    const index = room['viewerSocketIds'].indexOf(socketId)
    if (index !== -1) {
      room['viewerSocketIds'].splice(index, 1)
    }
  }
}

io.on('connection', socket => {
  console.log(socket.id, 'connected')
  initializePlayerData(socket)

  socket.on('setUsername', username => {
    setPlayerUsername(socket.id, username)
  })

  socket.on('getAllRooms', () => {
    const roomNames = Object.keys(rooms)
    // socket.emit('roomUpdateAll', roomNames)
  })

  socket.on('createRoom', () => {
    const roomId = createRoom(socket.id)
    socket.join(roomId)
    // socket.emit('playerStatus', roomId, playerStatus)
    // io.emit('roomUpdate', roomId)
  })

  socket.on('joinRoom', roomId => {
    const { playerStatus } = joinRoom(roomId, socket.id)
    socket.join(roomId)
    // socket.emit('playerStatus', roomId, playerStatus)
    // socket.to(roomId).emit('someoneJoinRoom', mapSocketIdToUsername[socket.id])
  })

  socket.on('leaveRoom', roomId => {
    socket.leave(roomId)

    socket.emit('leavedRoom', roomId)
    socket.to(roomId).emit('someoneLeaveRoom', mapSocketIdToUsername[socket.id])
    rooms[roomId]
  })

  socket.on('getBoardState', () => {
    socket.emit('updateWholeBoardState', rooms[mapSocketIdToRoomId[socket.id]].boardState)
  })

  socket.on('move', position => {
    socket.to(roomId).emit('moved', position)
  })

  socket.on('disconnect', () => {
    delete socketList[socket.id]
    delete mapSocketIdToUsername[socket.id]
    socket.removeAllListeners()
    console.log(socket.id, 'disconnected')
  })
})

server.listen(3001, () => console.log('listening on port 3001'))
// const io = require('socket.io').listen(server)

/* global User */
class UserManager {
  constructor (ownUser, p5, socket) {
    this.users = new Map([[ownUser.id, ownUser]])
    this.p5 = p5
    this.socket = socket
  }

  addUser ({ id, brushes }) {
    const user = new User(id, brushes, this.p5, this.socket)
    this.users.set(id, user)
  }

  toObject () {
    const existingUsers = Array.from(this.users.values(), (user) => user.toObject())
    const canvas64 = this.p5.canvas.toDataURL()
    return { canvas64, existingUsers }
  }

  listen () {
    // receive info for a new user
    this.socket.on('receiveWhiteboardUser', this.addUser.bind(this))

    // disconnect user
    this.socket.on('receiveDisconnectedWhiteboardUserId', ({ id }) => {
      this.users.delete(id)
    })
    // send existing info to a new user
    this.socket.on('requestToSendExistingWhiteboardInfo', ({ socketId }) => {
      // copy other users and add yourself
      const info = this.toObject()
      // send data as well as socketId
      this.socket.emit('sendExistingWhiteboardInfo', { socketId, ...info })
    })

    // receive info for existing users, which you will only do if you just joined
    this.socket.on('receiveExistingWhiteboardInfo', ({ canvas64, existingUsers }) => {
      const style = this.p5.canvas.style
      this.p5.loadImage(canvas64, (img) =>
        this.p5.image(img, 0, 0, parseInt(style.width, 10), parseInt(style.height, 10)))
      existingUsers.forEach(this.addUser.bind(this))
    })

    // receive event of someone else drawing
    this.socket.on('receiveWhiteboardMouse', (data) => {
      const user = this.users.get(data.id)
      user.updateBrush(data.brushPath, data.color, data.size)
      user.draw(data.pos.x, data.pos.y)
    })
  }
}

window.UserManager = UserManager

const express = require("express")
const cors = require("cors")
const connectDB = require("./config/db")

const startUsersWatcher = require("./watchers/users.watcher")
const startTransactionsWatcher = require("./watchers/transactions.watcher")

const app = express()
const PORT = 8000

connectDB()

app.use(cors({ origin: "*" }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 🔥 SSE endpoint
app.get("/api/realtime-events", require("./sse/sseRoute"))

// 🔥 Live Support
app.use("/api/liveSupport", require("./routes/liveSupport"))

// 🔥 Start MongoDB watchers
startUsersWatcher()
startTransactionsWatcher()

app.listen(PORT, () => {
  console.log(`🚀 Realtime server running on port ${PORT}`)
})

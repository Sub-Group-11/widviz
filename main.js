const { app, BrowserWindow, ipcMain, dialog } = require("electron")
const path = require("path")
const { spawn } = require("child_process")
const fs = require("fs")
const { networkInterfaces } = require("os")

// Global window reference
let mainWindow
let pythonProcess = null
const serverUrl = "http://localhost:5000"

// Get local IP for network access
function getLocalIpAddress() {
  const nets = networkInterfaces()
  const results = {}

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) {
          results[name] = []
        }
        results[name].push(net.address)
      }
    }
  }

  for (const name of Object.keys(results)) {
    if (results[name].length > 0) {
      return results[name][0]
    }
  }

  return "localhost"
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "WidViz",
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "assets/icon.ico"),
  })

  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"))

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Start Python backend server
function startPythonBackend() {
  // Get path to Python script based on environment
  let pythonScript = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "widviz_backend.py")
    : path.join(__dirname, "backend", "widviz_backend.py")

  console.log("Python script path:", pythonScript)

  if (!fs.existsSync(pythonScript)) {
    dialog.showErrorBox("Backend Error", `Could not find the Python backend script at: ${pythonScript}`)
    app.quit()
    return
  }

  const pythonExecutable = process.platform === "win32" ? "python" : "python3"
  pythonProcess = spawn(pythonExecutable, [pythonScript])

  // Handle Python process output
  pythonProcess.stdout.on("data", (data) => {
    console.log(`Python stdout: ${data}`)
  })

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python stderr: ${data}`)
  })

  pythonProcess.on("close", (code) => {
    console.log(`Python process exited with code ${code}`)
    if (code !== 0) {
      dialog.showErrorBox(
        "Backend Error",
        `The Python backend process exited with code ${code}. Please check the logs for details.`,
      )
    }
  })

  // Wait for server to start
  setTimeout(() => {
    const localIp = getLocalIpAddress()
    console.log(`Server running at http://${localIp}:5000`)

    if (mainWindow) {
      mainWindow.webContents.send("server-started", {
        url: serverUrl,
        localIp: `http://${localIp}:5000`,
      })
    }
  }, 2000)
}

// App lifecycle events
app.whenReady().then(() => {
  createWindow()
  startPythonBackend()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (mainWindow === null) createWindow()
})

// Clean up Python process on exit
app.on("will-quit", () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }
})

// IPC handlers
ipcMain.handle("get-server-url", () => {
  const localIp = getLocalIpAddress()
  return {
    url: serverUrl,
    localIp: `http://${localIp}:5000`,
  }
})
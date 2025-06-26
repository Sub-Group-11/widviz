const { contextBridge, ipcRenderer } = require("electron")

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld("api", {
  getServerUrl: () => ipcRenderer.invoke("get-server-url"),
  onServerStarted: (callback) => {
    ipcRenderer.on("server-started", (event, ...args) => callback(...args))
    return () => {
      ipcRenderer.removeListener("server-started", callback)
    }
  },
})
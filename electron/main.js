const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

/**
 * Electron entry point to display the calendar widget as a native desktop
 * overlay. This script creates a frameless, transparent window that stays
 * on top of other windows and loads the calendar widget from the local
 * development server or built files. Adjust the `loadURL` path to point
 * to your deployed widget page. You can run this via `electron electron/main.js`.
 */
function createWidgetWindow() {
  // Determine primary display size to center the widget by default
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: 600,
    height: 650,
    x: Math.floor((width - 600) / 2),
    y: Math.floor((height - 650) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the widget page. During development you can point to the Vite/React dev server.
  // For production, replace with a `file://` URL to your built index.html.
  // Example: win.loadFile(path.join(__dirname, '../dist/index.html'));
  const devURL = process.env.WIDGET_URL || 'http://localhost:3000';
  // If you have a dedicated route for the widget, append it (e.g., '/widget').
  win.loadURL(devURL);

  // Optional: remove the default menu
  win.setMenu(null);
}

app.whenReady().then(() => {
  createWidgetWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWidgetWindow();
  });
});

// Quit when all windows are closed except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
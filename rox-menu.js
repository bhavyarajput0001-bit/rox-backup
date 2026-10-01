const { app, Menu, Tray, nativeImage, shell, dialog } = require('electron');
const { exec } = require('child_process');
const path = require('path');

let tray = null;
const ROX_DIR = '/Users/bhavyarajput/Downloads/Rox';
const ROX_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3000/api/assistant';

function createTray() {
  // Create a simple icon (using system template)
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets/icon.png')).resize({ width: 18, height: 18 });
  if (icon.isEmpty()) {
    // Fallback: create a simple canvas icon
    const canvas = nativeImage.createFromDataURL('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iOSIgY3k9IjkiIHI9IjgiIHN0cm9rZT0iI0ZGRjYwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik05IDEgVjE3IiBzdHJva2U9IiNGRkY2MDAiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMSA5IEgxNyIgc3Ryb2tlPSIjRkZGNjAwIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+');
    tray = new Tray(canvas.resize({ width: 18, height: 18 }));
  } else {
    tray = new Tray(icon);
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: '🚀 Rox Orb', enabled: false },
    { type: 'separator' },
    { 
      label: 'Open Rox Dashboard', 
      click: () => shell.openExternal(ROX_URL) 
    },
    { 
      label: 'Open in New Window', 
      click: () => shell.openExternal(ROX_URL + '?standalone=1') 
    },
    { type: 'separator' },
    { label: 'Quick Actions', enabled: false },
    { 
      label: '🎬 Open YouTube', 
      click: () => quickCommand('open youtube') 
    },
    { 
      label: '🎵 Open Spotify', 
      click: () => quickCommand('open spotify') 
    },
    { 
      label: '💻 Open Terminal', 
      click: () => quickCommand('open terminal') 
    },
    { 
      label: '🔍 Search Web', 
      click: () => { 
        const { response } = dialog.showMessageBoxSync({ 
          type: 'question', 
          buttons: ['Search', 'Cancel'], 
          defaultId: 0, 
          message: 'Search for:', 
          detail: 'Enter search query',
          text: ''
        });
      }) 
    },
    { 
      label: '🔋 Check Battery', 
      click: () => quickCommand('battery') 
    },
    { 
      label: '⏰ Current Time', 
      click: () => quickCommand('time') 
    },
    { 
      label: '📊 System Status', 
      click: () => quickCommand('status') 
    },
    { type: 'separator' },
    { label: 'Dev Controls', enabled: false },
    { 
      label: '▶️ Start Rox Server', 
      click: () => runCommand('cd ' + ROX_DIR + ' && npx next dev -p 3000', 'Starting Rox...') 
    },
    { 
      label: '🔄 Restart Server', 
      click: () => { runCommand('pkill -f "next dev"', 'Stopping...'); setTimeout(() => runCommand('cd ' + ROX_DIR + ' && npx next dev -p 3000', 'Restarting...'), 2000); } 
    },
    { 
      label: '⏹️ Stop Server', 
      click: () => runCommand('pkill -f "next dev"', 'Stopping Rox...') 
    },
    { type: 'separator' },
    { 
      label: '📁 Open Project Folder', 
      click: () => shell.openPath(ROX_DIR) 
    },
    { 
      label: '📝 View Logs', 
      click: () => shell.openExternal('http://localhost:3000/api/assistant') 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      role: 'quit' 
    }
  ]);

  tray.setToolTip('Rox AI Assistant');
  tray.setContextMenu(contextMenu);
}

function quickCommand(message) {
  exec(`curl -s -X POST "${API_URL}" -H "Content-Type: application/json" -d '{"message":"${message}"}'`, (error, stdout, stderr) => {
    if (error) {
      console.error('Error:', error);
      return;
    }
    try {
      const result = JSON.parse(stdout);
      showNotification('Rox', result.reply?.slice(0, 100) || 'Done');
    } catch (e) {
      showNotification('Rox', 'Command sent');
    }
  });
}

function runCommand(cmd, notification) {
  exec(cmd, (error, stdout, stderr) => {
    showNotification('Rox', notification + (error ? ' (check terminal)' : ' done'));
  });
}

function showNotification(title, body) {
  exec(`osascript -e 'display notification "${body}" with title "${title}"'`);
}

app.whenReady().then(() => {
  createTray();
  app.dock.hide(); // Hide from dock
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

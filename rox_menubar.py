#!/usr/bin/env python3
"""
Rox Menu Bar App - runs in background
"""
import rumps
import requests
import subprocess
import threading
import webbrowser

ROX_DIR = '/Users/bhavyarajput/Downloads/Rox'
ROX_URL = 'http://localhost:3000'
API_URL = 'http://localhost:3000/api/assistant'

class RoxMenuBarApp(rumps.App):
    def __init__(self):
        super(RoxMenuBarApp, self).__init__("🤖", quit_button=rumps.MenuItem("Quit", key='q'))
        self.menu = [
            rumps.MenuItem("🚀 Rox Orb", callback=None),
            None,
            rumps.MenuItem("📊 Open Rox Dashboard", callback=self.open_dashboard),
            rumps.MenuItem("🪟 Open Standalone", callback=self.open_standalone),
            None,
            rumps.MenuItem("⚡ Quick Actions", callback=None),
            rumps.MenuItem("🎬 Open YouTube", callback=lambda _: self.quick_command("open youtube")),
            rumps.MenuItem("🎵 Open Spotify", callback=lambda _: self.quick_command("open spotify")),
            rumps.MenuItem("💻 Open Terminal", callback=lambda _: self.quick_command("open terminal")),
            rumps.MenuItem("🌐 Open Chrome", callback=lambda _: self.quick_command("open chrome")),
            rumps.MenuItem("📝 Open VS Code", callback=lambda _: self.quick_command("open vscode")),
            rumps.MenuItem("🔍 Search Web", callback=self.search_web),
            rumps.MenuItem("🔋 Battery", callback=lambda _: self.quick_command("battery")),
            rumps.MenuItem("⏰ Time", callback=lambda _: self.quick_command("time")),
            rumps.MenuItem("📍 Status", callback=lambda _: self.quick_command("status")),
            None,
            rumps.MenuItem("🎬 YouTube", callback=None),
            rumps.MenuItem("▶️ Generate Video", callback=lambda _: self.quick_command("yt generate python")),
            rumps.MenuItem("📝 Script", callback=lambda _: self.quick_command("yt script python")),
            rumps.MenuItem("🏷️ Hashtags", callback=lambda _: self.quick_command("yt hashtags python")),
            rumps.MenuItem("📅 Calendar", callback=lambda _: self.quick_command("yt calendar")),
            rumps.MenuItem("📈 Analytics", callback=lambda _: self.quick_command("yt analytics")),
            None,
            rumps.MenuItem("🎵 Spotify", callback=None),
            rumps.MenuItem("▶️ Play", callback=lambda _: self.quick_command("spotify play")),
            rumps.MenuItem("⏸️ Pause", callback=lambda _: self.quick_command("spotify pause")),
            rumps.MenuItem("⏭️ Next", callback=lambda _: self.quick_command("spotify next")),
            rumps.MenuItem("🎵 Now Playing", callback=lambda _: self.quick_command("spotify now")),
            None,
            rumps.MenuItem("🔧 Dev Controls", callback=None),
            rumps.MenuItem("▶️ Start Server", callback=self.start_server),
            rumps.MenuItem("🔄 Restart", callback=self.restart_server),
            rumps.MenuItem("⏹️ Stop Server", callback=self.stop_server),
            None,
            rumps.MenuItem("📁 Open Project", callback=lambda _: subprocess.Popen(['open', ROX_DIR])),
            rumps.MenuItem("🌐 API Health", callback=self.check_api),
        ]
    
    def quick_command(self, message):
        def run():
            try:
                resp = requests.post(API_URL, json={"message": message}, timeout=10)
                data = resp.json()
                reply = data.get('reply', 'Done')
                rumps.notification("Rox", "Quick Command", reply[:100])
            except Exception as e:
                rumps.notification("Rox", "Error", str(e)[:50])
        threading.Thread(target=run, daemon=True).start()
    
    def open_dashboard(self, _):
        webbrowser.open(ROX_URL)
    
    def open_standalone(self, _):
        webbrowser.open(ROX_URL + '?standalone=1')
    
    def search_web(self, _):
        window = rumps.Window('Search for:', 'Rox Search', ok='Search', cancel='Cancel', default_text='')
        response = window.run()
        if response.clicked and response.text:
            self.quick_command(f"search for {response.text}")
    
    def start_server(self, _):
        rumps.notification("Rox", "Server", "Starting...")
        subprocess.Popen(['npx', 'next', 'dev', '-p', '3000'], cwd=ROX_DIR)
    
    def restart_server(self, _):
        subprocess.run(['pkill', '-f', 'next dev'])
        import time; time.sleep(1)
        self.start_server(_)
    
    def stop_server(self, _):
        subprocess.run(['pkill', '-f', 'next dev'])
        rumps.notification("Rox", "Server", "Stopped")
    
    def check_api(self, _):
        def run():
            try:
                resp = requests.get('http://localhost:3000/api/assistant', timeout=5)
                data = resp.json()
                rumps.notification("Rox API", "Health", f"Status: {data.get('status', 'unknown')}")
            except Exception as e:
                rumps.notification("Rox API", "Error", str(e)[:50])
        threading.Thread(target=run, daemon=True).start()

if __name__ == '__main__':
    RoxMenuBarApp().run()
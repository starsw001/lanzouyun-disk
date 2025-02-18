import {app, BrowserWindow} from 'electron'
import path from 'path'
import isDev from 'electron-is-dev'
import {Cookie} from 'tough-cookie'
import store from '../common/store'
import config from '../project.config'
import {Application} from './application'
import {Ipc} from './ipc'
import {AppMenu} from './menu'

// todo: 根据 platform 显示不同外观
console.log('process.platform', process.platform) // darwin, win32

const loadURL = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '..', 'index.html')}`

class App extends Application {
  constructor() {
    super()
    app.on('window-all-closed', function () {
      if (process.platform !== 'darwin') app.quit()
    })
  }

  async ready() {
    store.set('isDev', isDev)
    if (!store.get('downloads')) {
      store.set('downloads', app.getPath('downloads'))
    }
    this.createWindow()
  }

  closed() {
    this.mainWindow = null
  }

  activate() {
    if (!this.mainWindow) this.createWindow()
  }

  async windowReady(win: Electron.BrowserWindow) {
    const cookie = store.get('cookies', [])?.find(value => value.key === 'phpdisk_info')
    if (cookie && Cookie.fromJSON(cookie).validate()) {
      await this.loadMain(win)
    } else {
      await this.clearAuth()
      await this.loadAuth(win)
    }
  }

  async onLogin(win, detail) {
    await this.loadMain(win)
  }

  async onLogout(win: Electron.CrossProcessExports.BrowserWindow) {
    await this.loadAuth(win)
  }

  async loadMain(win: BrowserWindow) {
    await win.loadURL(loadURL)
    if (isDev) {
      win.webContents.openDevTools({mode: 'bottom'})
    }
  }

  async loadAuth(win: BrowserWindow) {
    await win.loadURL(config.lanzouUrl + config.page.login)
    await win.webContents.insertCSS('*{visibility:hidden}.p1{visibility:visible}.p1 *{visibility:inherit}')
  }
}

const electronApp = new App()
electronApp.install(new Ipc())
if (!isDev) {
  electronApp.install(new AppMenu())
}

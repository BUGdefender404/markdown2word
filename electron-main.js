/*!
 * Electron 主进程：把网页版封装为独立桌面应用
 * - 加载本地 index.html（离线可用）
 * - 托盘常驻：点 X 缩到托盘，托盘左键唤起/隐藏，右键菜单可退出
 * - 双击快捷方式/再次启动时唤起已开窗口（单实例）
 * - 外部链接用系统默认浏览器打开
 * - docx 下载弹出"另存为"对话框
 */
const { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } = require('electron');
const path = require('path');

let win = null;
let tray = null;
let quitting = false;   // 区分"点 X 藏到托盘"与"真正退出"

function showWindow() {
  if (!win || win.isDestroyed()) { createWindow(); return; }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function toggleWindow() {
  if (!win || win.isDestroyed()) { createWindow(); return; }
  if (win.isVisible() && !win.isMinimized()) {
    win.hide();
  } else {
    showWindow();
  }
}

function createTray() {
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icons', 'icon-32.png'));
    tray = new Tray(icon);
    tray.setToolTip('Markdown2Word — Markdown 片段转 Word\n左键：显示/隐藏窗口，右键：菜单');
    const menu = Menu.buildFromTemplate([
      { label: '显示主窗口', click: showWindow },
      { type: 'separator' },
      { label: '退出', click: () => { quitting = true; app.quit(); } }
    ]);
    tray.on('click', toggleWindow);
    tray.on('right-click', () => tray.popUpContextMenu(menu));
    tray.on('double-click', showWindow);
  } catch (err) {
    // 图标缺失等异常不应导致应用崩溃，只是没有托盘
    console.error('托盘初始化失败:', err);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 780,
    minHeight: 560,
    autoHideMenuBar: true,          // 隐藏默认菜单栏，界面更接近普通桌面软件
    backgroundColor: '#f4f6fb',
    title: 'Markdown2Word',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  // 点 X：不退出，缩到托盘（退出走托盘右键菜单）
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });

  // 页面里的 blob 下载（docx）弹"另存为"，默认文件名由页面提供
  win.webContents.session.on('will-download', (event, item) => {
    const savePath = dialog.showSaveDialogSync(win, {
      title: '保存 Word 文档',
      defaultPath: item.getFilename()
    });
    if (!savePath) {
      event.preventDefault();
      return;
    }
    item.setSavePath(savePath);
  });

  // 所有新窗口/外链交给系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // 已经有一个实例在跑：让已有窗口显示出来，本进程直接退出
  app.quit();
} else {
  app.on('second-instance', showWindow);

  Menu.setApplicationMenu(null);      // 彻底去掉菜单栏
  app.setAppUserModelId('com.md2word.desktop');

  app.whenReady().then(() => {
    createWindow();
    createTray();
  });

  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => app.quit());
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
}

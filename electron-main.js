/*!
 * Electron 主进程：把网页版封装为独立桌面应用
 * - 加载本地 index.html（离线可用）
 * - 外部链接用系统默认浏览器打开
 * - docx 下载弹出"另存为"对话框
 */
const { app, BrowserWindow, shell, dialog, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
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

Menu.setApplicationMenu(null);      // 彻底去掉菜单栏
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

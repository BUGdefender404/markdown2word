# 第三方组件声明（NOTICE）

本项目主体代码以 MIT 许可证发布（见 LICENSE）。`vendor/` 目录中捆绑了以下第三方库：

| 库 | 版本 | 许可证 | 用途 |
|----|------|--------|------|
| markdown-it | 15.x | MIT | Markdown 解析 |
| temml | 0.13.x | MIT | LaTeX → MathML |
| mathml2omml | 0.5.x | **LGPL-3.0-or-later** | MathML → Word 原生公式 (OMML) |
| JSZip | 3.10.x | MIT / GPL-V3 双许可（选用 MIT） | 生成 .docx 压缩包 |

## 关于 mathml2omml（LGPL-3.0）

- 该库以**未经压缩混淆的构建产物**（`vendor/mathml2omml.iife.js`，由官方 ESM 构建打包而成）形式单独存放于 `vendor/` 目录，与其他代码物理分离，便于单独替换或升级。
- 如需替换该库，只需替换 `vendor/mathml2omml.iife.js` 并保持全局导出 `Mml2OmmlLib.mml2omml(mathmlString)` 接口不变即可。
- 库源码与许可文本：https://github.com/fiduswriter/mathml2omml

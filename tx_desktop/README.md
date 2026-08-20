# txcode Desktop

基于 Electron + Vue2 + Vite 的 txcode 桌面客户端。

## 技术栈

- Electron 34 / electron-builder 25
- Vue 2.7 + Vue Router 3
- Vite 6
- Monaco Editor / xterm.js
- Element UI

## 开发

```bash
# 安装依赖（使用国内镜像）
npm install

# 启动开发模式（仅前端热更新）
npm run dev

# 启动 Electron + 后端
npm run electron:dev
```

## 构建

```bash
# Windows
npm run build:win

# macOS
npm install . --registry=https://registry.npmmirror.com
npm run build && ELECTRON_CACHE=/Users/wuxuewen/.electron-cache npm run desktop:build:mac
```

构建产物输出到 `release/` 目录。

## 项目结构

```
desktop/
├── main.js                 # Electron 主进程（端口分配、后端启动、托盘）
├── preload.cjs             # 预加载脚本（IPC 桥接）
├── vite.config.js          # Vite 构建配置
├── electron-builder.yml    # electron-builder 打包配置
├── .npmrc                  # npm 镜像配置
└── src/
    ├── api/                # API 封装
    ├── components/         # 组件
    ├── layouts/            # 布局
    ├── router/             # 路由
    ├── utils/              # 工具函数（IPC 等）
    └── views/              # 页面
        ├── code/           # 编码
        ├── design/         # 设计
        ├── specs/          # 规范
        ├── skills/         # Skill
        ├── plugins/        # 插件
        │   └── webshell/   # WebShell 插件
        └── settings/       # 设置
```

## 注意事项

- 桌面端依赖根目录 `dist/` 编译产物，开发前需先执行根目录 `npm run build`
- 后端端口从 41000 起自动查找可用端口
- Electron 二进制下载使用 npmmirror 镜像，配置在 `.npmrc`

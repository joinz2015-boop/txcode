# 如何开始

## 环境要求

- **Node.js**: v18.0.0 或更高版本
- **npm** / **pnpm** / **yarn**: 任一包管理器
- **操作系统**: Windows / macOS / Linux

## 安装 txcode

### 全局安装（推荐）

```bash
npm install -g tianxincode
```

安装完成后，在终端输入 `txcode` 即可启动。

### 使用 npx 运行

如果你不想全局安装，可以使用 npx 直接运行：

```bash
npx tianxincode
```

## 启动 Web 服务

txcode 提供 Web 界面，方便通过浏览器进行操作和配置。

```bash
txcode web
```

启动后，默认访问地址：`http://localhost:40000`

## 启动 命令行模式

txcode 提供 Web 界面，方便通过浏览器进行操作和配置。

```bash
txcode
```


## 下一步

启动 Web 服务后，需要配置 AI 模型才能使用：

- [配置模型](/configuration/model.html) - 添加 AI 服务商和模型

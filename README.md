# txcode

AI Coding Assistant - 一个强大的 AI 编程助手命令行工具。

## 安装

### 全局安装（推荐）

```bash
npm install -g tianxincode
```

安装完成后，您可以在任何目录下使用 `txcode` 命令。


## 快速开始

安装完成后，直接在终端中运行：

```bash
txcode web
```

访问http://localhost:4000 页面设置里配置模型提供商和模型，然后可以web端交互，也可以ctrl+c 关闭后启动命令行方式

```bash
txcode
```

## 基本用法

### 启动交互模式（默认）

```bash
txcode
```

或者明确指定：

```bash
txcode chat
```

### 启动 Web 界面

```bash
txcode web
```

### 指定 Web 服务端口

```bash
txcode web --port 40001
```

### 获取帮助（在交互模式中）

启动交互模式后，输入 `/help` 查看可用命令。

## 功能特性

- **交互式命令行界面**：直接在终端中与 AI 助手对话
- **代码智能分析**：支持代码搜索、文件操作、Git 集成等功能
- **项目记忆管理**：自动记录项目关键信息，快速定位代码
- **多工具支持**：内置文件操作、代码搜索、网络搜索等工具
- **Web 界面**：提供图形化操作界面（可选）

## 使用示例

### 1. 启动交互模式

```bash
# 启动交互式命令行界面
txcode

# 启动后，您可以输入自然语言指令，例如：
> 搜索所有包含 "function" 的 TypeScript 文件
> 读取 src/index.ts 文件
> 查看当前 Git 状态
```

### 2. 使用 Web 界面

```bash
# 启动 Web 服务（默认端口 40000）
txcode web

# 指定端口启动
txcode web --port 40001
```

### 3. 交互式命令

在交互模式中，可以使用以下命令：

```
/help          - 显示帮助信息
/new [标题]    - 创建新会话
/sessions      - 列出所有会话
/switch <ID>   - 切换到指定会话
/models        - 列出可用模型
/model <ID>    - 切换模型
/skills        - 列出可用技能
/use <技能名>  - 使用特定技能
/token         - 显示 Token 使用统计
/exit          - 退出程序
```

### 4. 常见任务示例

```
# 代码搜索和分析
> 查找所有使用 useState 的 React 组件
> 分析项目的目录结构
> 搜索包含特定错误信息的文件

# 文件操作
> 创建新的组件文件
> 修改现有代码
> 批量重命名文件

# Git 操作
> 查看最近的提交
> 创建新的分支
> 提交当前更改
```

## 配置说明

### 环境变量

工具支持以下环境变量：

- `OPENAI_API_KEY`：OpenAI API 密钥（必需）
- `TXCODE_WORKSPACE`：工作空间目录路径（可选）

### 配置文件

工具会在工作目录下创建 `.txcode` 文件夹，用于存储：
- 项目记忆文件
- 会话历史
- 配置文件

## 项目结构

```
├── src/          # 源代码目录
│   ├── index.ts          # 主入口文件
│   ├── modules/          # 功能模块
│   └── types/           # 类型定义
├── dist/         # 构建输出目录
├── tests/        # 测试文件
└── package.json  # 项目配置
```

## 开发说明

> **注意**：以下内容主要面向开发者，普通用户无需关注。

### 开发环境设置

```bash
# 克隆项目
git clone <repository-url>
cd txcode

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建项目
npm run build
```

### 运行测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 发布新版本

```bash
# 更新版本号
npm version patch  # 或 minor, major

# 发布到 npm
npm publish
```

## 许可证

ISC

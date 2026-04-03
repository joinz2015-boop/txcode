# 配置模型

在使用 txcode 之前，你需要配置 AI 服务商和模型。配置通过 Web 界面完成。

## 进入设置页面

1. 启动 txcode Web 服务：

```bash
txcode web
```

2. 浏览器打开 `http://localhost:40000`
3. 点击左下角的 **设置图标**（齿轮形状）
4. 在左侧菜单中选择 **AI 服务商**

## 添加 AI 服务商

1. 点击 **"+ 添加服务商"** 按钮
2. 在弹出的对话框中：
   - **预设模板**：可以选择 OpenAI、DeepSeek、OpenRouter 等预设，或选择"自定义"
   - **名称**：输入服务商名称（如 OpenAI）
   - **API Key**：输入你的 API 密钥
   - **Base URL**：API 地址（预设模板会自动填充）

3. 点击 **"保存"**

## 添加模型

1. 点击刚添加的服务商卡片左侧的 **展开按钮**
2. 在模型列表区域，点击 **"+ 添加模型"**
3. 在弹出的对话框中：
   - **所属服务商**：自动选择当前服务商
   - **模型名称**：输入模型名称（如 `gpt-4o`、`deepseek-chat`）
   - **启用**：保持开启状态

4. 点击 **"保存"**


## 支持的服务商

txcode 支持以下预设模板：

| 预设 | Base URL |
|------|----------|
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

其他的可以走自定义

## 获取 API Key

各平台的 API Key 获取地址：

| 平台 | 地址 |
|------|------|
| OpenAI | https://platform.openai.com/api-keys |
| DeepSeek | https://platform.deepseek.com/api_keys |
| OpenRouter | https://openrouter.ai/keys |

## 推荐模型

- **OpenAI**: `gpt-4o`、`gpt-4o-mini`
- **DeepSeek**: `deepseek-chat`、`deepseek-coder`

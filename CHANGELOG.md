# change log


## 2026-04-13
支持手机端访问页面，可以在手机端 查看文件 变更记录 软件研发等

## 2026-04-17
加入memory功能，根据交互记录在项目下.txcode/memory/生成记忆文件MEMORY.md,并且可以在web 技能页面查看

## 2026-04-23
1、加入切换项目功能
2、加入开发进度日志记录

## 2026-04-24
1、加入OSS文件同步
主要解决在虚拟机里代码写完后 将编译后的target文件传到OSS 然后通过链接的方式在开发服务器或者生产服务器 wget 方式下载方便
2、加入配置导出和导入功能
我们可能在好几个虚拟机里用到txcode，这样配置需要重复配置，所以导出导入的方式快速配置生效
3、文件页面右键加入上传和下载功能
在控制虚拟机里的项目时 可能有把本地电脑的文件上传到虚拟机 ，或者android之类的编译好后要下载到本机的需求
4、支持deepseek v4


## 2026-05-22
### 版本管理统一化
- 版本号统一在 `src/config/tx.config.ts` 管理，Header 组件从配置读取
- 新增构建时版本同步脚本 `scripts/sync-version.js`，从 `package.json` 自动同步版本号到编译产物
- 构建脚本 `copy-txt` 提取为独立 ESM 脚本 `scripts/copy-txt.js`

### 技能选择组件
- 新增 `SkillSelectDialog` 组件，支持在聊天输入框通过 `[skill-name]` 标签快速调用技能
- 已集成到 PC 版 Step2Design、Step3CodeGen、Step4Test 页面

### DevWorkflow 开发工作流
- PC 端和 App 端新增 DevWorkflow 页面路由
- 支持 design/code/test 三阶段开发流程，WS 实时推送各阶段状态

### 聊天滚动优化
- 新增 `web/src/utils/scroll.js` 智能滚动工具
- Step2/3/4 和 codeView 统一使用该工具，距底 ≤50px 时自动跟随滚动

### 前端目录结构优化
- `views/` 拆分为 `pc/` 和 `app/`，App 端页面统一加 "App" 后缀
- `components/` 拆分为 `pc/` 和 `app/`，导入路径规范化

### 松饼 AI 平台对接
- 扩展松饼平台路由，支持 provider/model/config 完整 CRUD
- 前端设置页面对接配置管理，支持选择平台 provider 和 model

### 配置导出导入
- 支持 provider/model/config 配置的导出与导入，方便多环境快速部署

## 2026-05-25
支持代理功能，在设置下代理设置下配置代理
---
name: llm-wiki
description: 基于Andrej Karpathy的LLM Wiki理念，自动分析项目代码生成结构化知识库Wiki。生成调用链路图，支持快速了解功能和定位问题。适用于任何项目的代码结构梳理。
license: MIT
compatibility: txcode
metadata:
  audience: developers
  workflow: code-analysis, knowledge-management
---

## 一、功能概述

自动分析当前项目目录，生成可视化的代码知识库Wiki。核心价值：
- **快速了解功能**：AI写完代码后，可快速掌握项目结构和功能模块
- **快速定位问题**：通过调用链路快速定位代码位置

---

## 二、文件结构

```
llm-wiki/
├── SKILL.md           # 总览和索引
├── 01-menu.md         # 如何生成 menu.md
├── 02-entry.md        # 如何找入口文件
├── 03-analyze.md      # 如何分析生成 md 文件
├── 04-incremental.md  # 增量更新逻辑
└── validate-menu.cjs  # 菜单验证脚本
```

---

## 三、目录结构

```
.txcode/wiki/
├── menu.yaml         # 索引目录（YAML格式，含git信息）
├── frontend/          # 前端页面分析
│   └── {模块}/
│       └── {页面}.md
└── backend/          # 后端接口分析
    └── {模块}/
        └── {接口}.md
```

> git 信息存储在 menu.yaml 中，首次从 `git_commit` 读取上次分析版本，增量更新。

---

## 四、工作流程

```
1. [01-menu.md] 分析项目结构，确定大类（frontend/backend）
2. [02-entry.md] 扫描入口文件，确定模块划分
3. [03-analyze.md] 对每个入口文件生成分析文档
4. [04-incremental.md] 记录 git commit id，下次增量更新
```

---

## 五、快速开始

### 首次生成
```
1. 执行 git log 获取最新 commit id
2. 创建 .txcode/wiki/ 目录
3. 分析所有入口文件
4. 生成 menu.yaml
5. 创建 wiki.json 保存 commit id
6. 运行 validate-menu.cjs 验证菜单合理性
```

### 增量更新
```
1. 读取 wiki.json 获取上次 commit id
2. 执行 git diff 获取变更文件
3. 只分析变更的文件
4. 更新对应的 md 文件
5. 更新 wiki.json 的 commit id
6. 运行 validate-menu.cjs 验证菜单合理性
```

### 验证菜单
```bash
node txcode/skills/llm-wiki/validate-menu.cjs [.txcode/wiki/menu.yaml]
```

> ⚠️ **重要**：每次生成或更新 menu.yaml 后，必须运行验证脚本确认菜单结构正确。验证逻辑与 WikiSidebar.vue 显示逻辑一致：节点有 `children` 时显示为文件夹，有 `url` 时显示为叶子节点，二者不能同时存在。

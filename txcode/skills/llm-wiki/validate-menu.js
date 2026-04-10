#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let MENU_FILE = args[0];

if (!MENU_FILE) {
  const wikiDir = path.join(process.cwd(), '.txcode/wiki');
  MENU_FILE = path.join(wikiDir, 'menu.yaml');
}

const ERRORS = [];
const WARNINGS = [];

function validateMenu(menu, menuPath = []) {
  if (!Array.isArray(menu)) {
    ERRORS.push(`[${menuPath.join('.')}] 导航必须是数组`);
    return;
  }

  for (let i = 0; i < menu.length; i++) {
    const item = menu[i];
    const currentPath = [...menuPath, i];

    if (!item || typeof item !== 'object') {
      ERRORS.push(`[${currentPath.join('.')}] 菜单项必须是对象`);
      continue;
    }

    if (!item.title || typeof item.title !== 'string') {
      ERRORS.push(`[${currentPath.join('.')}] 缺少或无效的 title 字段`);
    }

    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const hasUrl = item.url && typeof item.url === 'string';

    if (hasChildren && hasUrl) {
      ERRORS.push(`[${currentPath.join('.')} "${item.title}"] 不能同时有 children 和 url`);
    }

    if (!hasChildren && !hasUrl) {
      ERRORS.push(`[${currentPath.join('.')} "${item.title}"] 必须有 children 或 url`);
    }

    if (item.icon && typeof item.icon !== 'string') {
      WARNINGS.push(`[${currentPath.join('.')} "${item.title}"] icon 应该是字符串`);
    }

    if (hasChildren) {
      validateMenu(item.children, currentPath);
    } else if (hasUrl) {
      if (!item.url.endsWith('.md')) {
        WARNINGS.push(`[${currentPath.join('.')} "${item.title}"] url 应该以 .md 结尾: ${item.url}`);
      }
      const wikiRoot = path.dirname(MENU_FILE);
      const mdPath = path.join(wikiRoot, item.url);
      if (!fs.existsSync(mdPath)) {
        WARNINGS.push(`[${currentPath.join('.')} "${item.title}"] 文件不存在: ${mdPath}`);
      }
    }
  }
}

function validateMenuFile(menuFile) {
  if (!fs.existsSync(menuFile)) {
    console.error(`\n❌ 文件不存在: ${menuFile}`);
    console.log(`\n用法: node validate-menu.js [menu.yaml路径]\n`);
    process.exit(1);
  }

  const content = fs.readFileSync(menuFile, 'utf-8');
  let data;

  try {
    data = yaml.load(content);
  } catch (e) {
    console.error(`\n❌ YAML 解析失败: ${e.message}\n`);
    process.exit(1);
  }

  console.log(`\n📋 验证菜单文件: ${menuFile}\n`);

  if (!data.site_name) {
    ERRORS.push('缺少 site_name 字段');
  }

  if (!data.nav || !Array.isArray(data.nav)) {
    ERRORS.push('缺少或无效的 nav 字段（必须是数组）');
  } else {
    validateMenu(data.nav, ['nav']);
  }

  if (data.git_commit) {
    try {
      const currentCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      if (data.git_commit !== currentCommit) {
        WARNINGS.push(`git_commit (${data.git_commit}) 与当前 HEAD (${currentCommit}) 不一致`);
      }
    } catch {
      // git 命令失败，忽略
    }
  }

  console.log('─'.repeat(50));

  if (ERRORS.length > 0) {
    console.log('\n❌ 错误:\n');
    ERRORS.forEach(e => console.log(`   ${e}`));
  }

  if (WARNINGS.length > 0) {
    console.log('\n⚠️  警告:\n');
    WARNINGS.forEach(w => console.log(`   ${w}`));
  }

  if (ERRORS.length === 0) {
    console.log('\n✅ 验证通过!\n');
    printMenuTree(data.nav);
    return true;
  } else {
    console.log('\n❌ 验证失败\n');
    return false;
  }
}

function printMenuTree(menu, indent = 0) {
  const prefix = ' '.repeat(indent * 2);
  for (const item of menu) {
    const icon = item.icon ? `[${item.icon.split(' ').pop()}] ` : '';
    if (item.children) {
      console.log(`${prefix}📁 ${icon}${item.title}`);
      printMenuTree(item.children, indent + 1);
    } else {
      console.log(`${prefix}📄 ${icon}${item.title}`);
    }
  }
}

const success = validateMenuFile(MENU_FILE);
process.exit(success ? 0 : 1);

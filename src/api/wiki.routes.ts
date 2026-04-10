/**
 * Wiki API 路由
 */

import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export const wikiRouter = Router();

const DOCS_BASE_PATH = path.resolve(process.cwd(), '.txcode/wiki');

wikiRouter.get('/menu', (req, res) => {
  try {
    const menuPath = path.join(DOCS_BASE_PATH, 'menu.yaml');
    if (!fs.existsSync(menuPath)) {
      return res.status(404).json({ success: false, error: 'menu.yaml not found' });
    }
    const menuContent = fs.readFileSync(menuPath, 'utf-8');
    const menuData = yaml.parse(menuContent);
    res.json({ success: true, data: menuData });
  } catch (error) {
    console.error('Error reading wiki menu:', error);
    res.status(500).json({ success: false, error: 'Failed to read menu' });
  }
});

wikiRouter.get('/content', (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ success: false, error: 'path parameter is required' });
    }
    
    const normalizedPath = filePath.replace(/^\//, '');
    const fullPath = path.join(DOCS_BASE_PATH, normalizedPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ success: true, data: content });
  } catch (error) {
    console.error('Error reading wiki content:', error);
    res.status(500).json({ success: false, error: 'Failed to read content' });
  }
});

wikiRouter.get('/asset', (req, res) => {
  try {
    const { path: assetPath } = req.query;
    if (!assetPath || typeof assetPath !== 'string') {
      return res.status(400).json({ success: false, error: 'path parameter is required' });
    }
    
    const normalizedPath = assetPath.replace(/^\//, '');
    const fullPath = path.join(DOCS_BASE_PATH, normalizedPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    res.sendFile(fullPath);
  } catch (error) {
    console.error('Error reading wiki asset:', error);
    res.status(500).json({ success: false, error: 'Failed to read asset' });
  }
});

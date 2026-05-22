import { readdirSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

function copyDirFiles(srcDir, dstDir, filter) {
  readdirSync(srcDir).filter(filter).forEach(f => {
    mkdirSync(dstDir, { recursive: true });
    copyFileSync(join(srcDir, f), join(dstDir, f));
  });
}

function copyFile(srcPath, dstPath) {
  const dstDir = dstPath.substring(0, dstPath.lastIndexOf('/'));
  mkdirSync(dstDir, { recursive: true });
  copyFileSync(srcPath, dstPath);
}

copyDirFiles('src/modules/tools/provider', 'dist/modules/tools/provider', f => f.endsWith('.txt'));
copyFile('src/modules/skill/skill.txt', 'dist/modules/skill/skill.txt');
copyFile('src/modules/ai/provider/openai/prompt/role.txt', 'dist/modules/ai/provider/openai/prompt/role.txt');

const agents = ['code', 'chat', 'task', 'mem', 'skill', 'caller'];
agents.forEach(agent => {
  copyFile(
    `src/modules/ai/agents/${agent}/prompts/role.txt`,
    `dist/modules/ai/agents/${agent}/prompts/role.txt`
  );
});

console.log('Copied .txt files to dist');

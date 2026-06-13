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

copyDirFiles('src/core/tools/provider', 'dist/core/tools/provider', f => f.endsWith('.txt'));
copyFile('src/services/skill/skill.txt', 'dist/services/skill/skill.txt');
copyFile('src/core/ai/provider/openai/prompt/role.txt', 'dist/core/ai/provider/openai/prompt/role.txt');

const agents = ['code', 'chat', 'task', 'mem', 'skill', 'caller'];
agents.forEach(agent => {
  copyFile(
    `src/core/ai/agents/${agent}/prompts/role.txt`,
    `dist/core/ai/agents/${agent}/prompts/role.txt`
  );
});

copyFile('src/core/ai/agents/dream/prompts/init.txt', 'dist/core/ai/agents/dream/prompts/init.txt');

console.log('Copied .txt files to dist');

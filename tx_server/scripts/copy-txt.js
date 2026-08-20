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

copyDirFiles('tx_server/src/core/tools/provider', 'dist/core/tools/provider', f => f.endsWith('.txt'));
copyFile('tx_server/src/service/skill/skill.txt', 'dist/service/skill/skill.txt');
copyFile('tx_server/src/core/ai/agents/common/prompt/role.txt', 'dist/core/ai/agents/common/prompt/role.txt');

const agents = ['code', 'chat', 'mem', 'skill', 'summarizer', 'design','plan','discuss','name','test'];
agents.forEach(agent => {
  copyFile(
    `tx_server/src/core/ai/agents/${agent}/prompts/role.txt`,
    `dist/core/ai/agents/${agent}/prompts/role.txt`
  );
});

copyFile('tx_server/src/core/ai/agents/dream/prompts/init.txt', 'dist/core/ai/agents/dream/prompts/init.txt');

console.log('Copied .txt files to dist');

import { contentValidator } from './react.validator';
import { ReActParser } from './react.parser';

function testValidator(name: string, content: string) {
  console.log(`\n========== ${name} ==========`);
  const result = contentValidator.validate(content);
  console.log('Valid:', result.valid, '| isFaultTolerance:', result.isFaultTolerance);
  if (!result.valid) {
    console.log('Error:', result.error);
  } else {
    console.log('Cleaned content:', result.cleanedContent);
  }
}

testValidator('1. Valid XML in code block', `找到关键代码了。
\`\`\`xml
<react>
  <thought>我需要读取文件</thought>
  <action>
    <action_name>read_file</action_name>
    <action_input>
      <file_path>E:\\ai\\txcode\\src\\components\\App.tsx</file_path>
    </action_input>
  </action>
</react>
\`\`\`
`);

testValidator('2. Invalid - partial XML (has <react> but no <thought>)', `这是一些文本内容。
<react>
  <action>edit_file</action>
</react>`);

testValidator('3. Fault Tolerance - no XML at all', `我已经完成了所有任务。文件已经保存。`);

async function testParser() {
  console.log('\n========== Full Parser Test ==========');
  const parser = new ReActParser();
  
  try {
    const result = await parser.parse(`好的，我来修改代码。
\`\`\`xml
<react>
  <thought>需要添加调试日志</thought>
  <action>
    <action_name>edit_file</action_name>
    <action_input>
      <file_path>E:\\ai\\txcode\\src\\App.tsx</file_path>
    </action_input>
  </action>
</react>
\`\`\``);
    console.log('Parse success:', JSON.stringify(result.steps, null, 2));
  } catch (e: any) {
    console.log('Parse error:', e.message);
  }

  console.log('\n========== Fault Tolerance Test ==========');
  try {
    const result = await parser.parse('我已经完成了所有任务。文件已经保存。');
    console.log('Fault tolerance parse success:', JSON.stringify(result.steps, null, 2));
    console.log('Final answer:', result.finalAnswer);
  } catch (e: any) {
    console.log('Fault tolerance error:', e.message);
  }
}

testParser();

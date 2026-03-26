import { contentValidator } from './react.validator';
import { ReActParser } from './react.parser';

function testValidator(name: string, content: string) {
  console.log(`\n========== ${name} ==========`);
  const result = contentValidator.validate(content);
  console.log('Valid:', result.valid);
  if (!result.valid) {
    console.log('Error:', result.error);
  } else {
    console.log('Cleaned content:', result.cleanedContent?.substring(0, 100) + '...');
  }
}

testValidator('Valid XML in code block', `找到关键代码了。
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

testValidator('Invalid - no react structure', `这是一些文本内容，但没有XML结构。
只是想看看验证器是否能正确拒绝。`);

testValidator('Valid - direct XML', `<react>
  <thought>我需要修改代码</thought>
  <action>
    <action_name>edit_file</action_name>
    <action_input>
      <file_path>E:\\ai\\txcode\\src\\App.tsx</file_path>
    </action_input>
  </action>
</react>`);

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

  console.log('\n========== Parser Error Test ==========');
  try {
    await parser.parse('这不是有效的 XML 结构');
  } catch (e: any) {
    console.log('Expected error caught:', e.message);
  }
}

testParser();

import { ReActParser } from './react.parser';

const parser = new ReActParser();

async function testParse(name: string, content: string) {
  console.log(`\n========== ${name} ==========`);
  
  const xmlResult = await (parser as any).parseXMLBlock(content);
  console.log('parseXMLBlock result:', xmlResult);
  
  const result = await parser.parse(content);
  console.log('Final result:', JSON.stringify(result.steps, null, 2));
}

const testCases = [
  {
    name: 'XML with CDATA',
    content: `<react>
  <thought>需要修改代码</thought>
  <action>
    <action_name>edit_file</action_name>
    <action_input>
      <file_path>E:\\ai\\txcode\\src\\components\\App.tsx</file_path>
      <old_string><![CDATA[test]]></old_string>
      <new_string><![CDATA[new test]]></new_string>
    </action_input>
  </action>
   <action>
    <action_name>edit_file</action_name>
    <action_input>
      <file_path>E:\\ai\\txcode\\src\\components\\App.tsx</file_path>
      <old_string><![CDATA[test]]></old_string>
      <new_string><![CDATA[new test]]></new_string>
    </action_input>
  </action>
</react>`
  }
];

async function runTests() {
  for (const tc of testCases) {
    await testParse(tc.name, tc.content);
  }
}

runTests();

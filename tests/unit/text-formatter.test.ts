const formatByNewline = (text: string): string => {
  return text.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
};

describe('文本格式化', () => {
  test('格式化文本', () => {
    const input = `这是第一行
  
这是第三行
   这是第四行   `;
    const result = formatByNewline(input);
    console.log('===== 格式化结果 =====');
    console.log(result);
    console.log('======================');
    expect(result).toBe('这是第一行\n这是第三行\n这是第四行');
  });
});
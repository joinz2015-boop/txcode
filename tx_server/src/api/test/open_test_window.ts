import { Request, Response } from 'express';

export async function POST(req: Request, res: Response): Promise<void> {
  try {
    const { backendPort, planFolderName, planFilePath, testUrl, modelName, sessionId, projectPath } = req.body || {};

    const actionPayload = JSON.stringify({
      action: 'open-test-window',
      context: {
        backendPort: backendPort || '',
        planFolderName: planFolderName || '',
        planFilePath: planFilePath || '',
        testUrl: testUrl || '',
        modelName: modelName || '',
        sessionId: sessionId || '',
        projectPath: projectPath || '',
      },
    });

    process.stdout.write('\n__TXCODE_ACTION__:' + actionPayload + '\n');

    res.json({ success: true, message: '测试窗口打开指令已发送' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || '打开测试窗口失败' });
  }
}

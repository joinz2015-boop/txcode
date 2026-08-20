; 覆盖 electron-builder 默认的进程检测宏
; 根因：NSIS 默认 nsProcess::FindProcess 模糊匹配 "txcode"，
; 导致安装器自身（如 txcode_1.0.56_win.exe）被误判为目标进程
; 修复：使用 tasklist 精确匹配 IMAGENAME eq txcode.exe

!macro _isAppRunning
  ; 精确匹配进程名 txcode.exe，排除安装器自身（txcode_x.x.x_win.exe）
  nsExec::ExecToStack 'cmd /c "tasklist /FI \"IMAGENAME eq txcode.exe\" 2>nul | find /I \"txcode.exe\" >nul"'
  Pop $R0
  ; $R0 = 0: 找到 txcode.exe（目标进程正在运行）
  ; $R0 != 0: 未找到（安全，可以继续安装）
!macroend

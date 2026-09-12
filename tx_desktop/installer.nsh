; ============================================================
; txcode 自定义 NSIS 钩子（electron-builder nsis.include）
;
; 目标：已安装旧版本时，双击新安装包可直接覆盖升级，无需手动卸载。
;
; 1) customCheckAppRunning —— 接管模板的进程检测（模板仅在未定义该宏时才定义
;    $pid / GetProcessInfo，故此处不可引用它们）：
;       温和关闭 → 强杀进程树 → 按命令行清理残留后端子进程 → 轮询确认退出
; 2) customInit —— initMultiUser 之后执行（$INSTDIR / $installMode 已确定）：
;       清理失效注册表残留 + 主动静默卸载旧版本（失败兜底，不中断安装）
;
; 注意：本文件同时被安装器与卸载器编译（CHECK_APP_RUNNING 两处都会插入），
;       宏内一律不使用 Var 与全局寄存器以外的状态。
; ============================================================

; 升级关闭标记：安装器写入，应用侧（tx_desktop/main.js）检测到后静默退出，
; 避免弹出“最小化到托盘/退出应用”确认框阻塞覆盖安装
!define TXCODE_UPGRADE_MARK "$TEMP\txcode-upgrade.lock"

; 按命令行清理残留的后端子进程：仅匹配安装目录下的 resources\app\dist\index.js，
; 避免误杀用户其它 node / txcode 进程（PowerShell 脚本，UTF-16LE + Base64 编码）
!define TXCODE_KILL_LEFTOVER `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand JABFAHIAcgBvAHIAQQBjAHQAaQBvAG4AUAByAGUAZgBlAHIAZQBuAGMAZQA9ACIAUwBpAGwAZQBuAHQAbAB5AEMAbwBuAHQAaQBuAHUAZQAiAA0ACgAkAHAAYQB0AHQAZQByAG4APQAiACoAcgBlAHMAbwB1AHIAYwBlAHMAXABhAHAAcABcAGQAaQBzAHQAXABpAG4AZABlAHgALgBqAHMAKgAiAA0ACgBmAG8AcgAoACQAaQA9ADAAOwAkAGkAIAAtAGwAdAAgADEAMgA7ACQAaQArACsAKQB7AA0ACgAgACAAJAByAHUAbgBuAGkAbgBnAD0AQAAoAEcAZQB0AC0AUAByAG8AYwBlAHMAcwAgAC0ATgBhAG0AZQAgAHQAeABjAG8AZABlACkADQAKACAAIAAkAGwAZQBmAHQAbwB2AGUAcgA9AEAAKABHAGUAdAAtAFcAbQBpAE8AYgBqAGUAYwB0ACAAVwBpAG4AMwAyAF8AUAByAG8AYwBlAHMAcwAgAHwAIABXAGgAZQByAGUALQBPAGIAagBlAGMAdAAgAHsAIAAoACQAXwAuAE4AYQBtAGUAIAAtAGUAcQAgACIAbgBvAGQAZQAuAGUAeABlACIAIAAtAG8AcgAgACQAXwAuAE4AYQBtAGUAIAAtAGUAcQAgACIAdAB4AGMAbwBkAGUALgBlAHgAZQAiACkAIAAtAGEAbgBkACAAJABfAC4AQwBvAG0AbQBhAG4AZABMAGkAbgBlACAALQBsAGkAawBlACAAJABwAGEAdAB0AGUAcgBuACAAfQApAA0ACgAgACAAaQBmACgAJAByAHUAbgBuAG4AaQBuAGcALgBDAG8AdQBuAHQAIAAtAGUAcQAgADAAIAAtAGEAbgBkACAAJABsAGUAZgB0AG8AdgBlAHIALgBDAG8AdQBuAHQAIAAtAGUAcQAgADAAKQB7ACAAZQB4AGkAdAAgADAAIAB9AA0ACgAgACAAZgBvAHIAZQBhAGMAaAAoACQAcAAgAGkAbgAgACQAbABlAGYAdABvAHYAZQByACkAewAgAHQAYQBzAGsAawBpAGwAbAAuAGUAeABlACAALwBGACAALwBUACAALwBQAEkARAAgACQAcAAuAFAAcgBvAGMAZQBzAHMASQBkACAAfAAgAE8AdQB0AC0ATgB1AGwAbAAgAH0ADQAKACAAIABTAHQAYQByAHQALQBTAGwAZQBlAHAAIAAtAE0AaQBsAGwAaQBzAGUAYwBvAG4AZABzACAANQAwADAADQAKAH0ADQAKAGUAeABpAHQAIAAwAA==`

; 写入升级标记（失败不影响安装流程）
!macro txcodeWriteUpgradeMark
  ClearErrors
  FileOpen $R8 "${TXCODE_UPGRADE_MARK}" w
  ${ifNot} ${errors}
    FileWrite $R8 "upgrade"
    FileClose $R8
  ${endif}
!macroend

!macro txcodeDeleteUpgradeMark
  ClearErrors
  ${if} ${FileExists} "${TXCODE_UPGRADE_MARK}"
    Delete "${TXCODE_UPGRADE_MARK}"
  ${endif}
!macroend

; 关闭正在运行的旧版本：温和关闭 → 强杀进程树 → 清理残留后端子进程 → 确认退出
!macro txcodeStopRunningApp
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    !insertmacro txcodeWriteUpgradeMark

    DetailPrint "Closing running ${PRODUCT_NAME}..."
    nsExec::ExecToLog 'taskkill /IM "${APP_EXECUTABLE_FILENAME}"'
    Sleep 2500

    ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
    ${if} $R0 == 0
      DetailPrint "Force killing ${PRODUCT_NAME} process tree..."
      nsExec::ExecToLog 'taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
      Sleep 1000
    ${endif}
  ${endif}

  ; 清理残留后端子进程（主进程已被强杀、仅剩 node 模式子进程的场景）
  nsExec::ExecToLog '${TXCODE_KILL_LEFTOVER}'

  !insertmacro txcodeDeleteUpgradeMark
!macroend

; 清理一个注册表分支下的旧安装：残留注册表清理 + 主动静默卸载
!macro txcodeCleanupOldInstall _HIVE _MODE
  ClearErrors
  ReadRegStr $0 ${_HIVE} "${INSTALL_REGISTRY_KEY}" InstallLocation
  ReadRegStr $1 ${_HIVE} "${UNINSTALL_REGISTRY_KEY}" UninstallString

  ${if} $0 != ""
  ${orIf} $1 != ""
    StrCpy $2 "$0\${UNINSTALL_FILENAME}"
    ${if} $0 == ""
    ${orIfNot} ${FileExists} "$2"
      ; 安装目录或卸载器已缺失：清理残留注册表，避免随后 uninstallFailed 弹窗中断安装
      DetailPrint "Cleaning stale ${PRODUCT_NAME} registry (${_HIVE})..."
      DeleteRegKey ${_HIVE} "${UNINSTALL_REGISTRY_KEY}"
      DeleteRegKey ${_HIVE} "${INSTALL_REGISTRY_KEY}"
    ${else}
      DetailPrint "Uninstalling previous ${PRODUCT_NAME} (${_HIVE})..."
      !insertmacro txcodeWriteUpgradeMark

      ClearErrors
      ExecWait '"$2" /S /KEEP_APP_DATA ${_MODE} --updated _?=$0' $3
      ${if} $3 != 0
      ${orIf} ${errors}
        ; 旧卸载器失败（文件被占用）：清理进程后重试一次
        DetailPrint "Previous uninstaller failed with code $3, retry after killing processes..."
        !insertmacro txcodeStopRunningApp

        ClearErrors
        ExecWait '"$2" /S /KEEP_APP_DATA ${_MODE} --updated _?=$0' $3
      ${endif}
      ${if} $3 != 0
      ${orIf} ${errors}
        ; 仍失败则清理注册表继续安装：模板的 uninstallOldVersion 随之成为空操作
        DetailPrint "Previous uninstaller still failed with code $3, clean registry and continue."
        DeleteRegKey ${_HIVE} "${UNINSTALL_REGISTRY_KEY}"
        DeleteRegKey ${_HIVE} "${INSTALL_REGISTRY_KEY}"
      ${endif}

      !insertmacro txcodeDeleteUpgradeMark
    ${endif}
  ${endif}
!macroend

!macro customCheckAppRunning
  !insertmacro txcodeStopRunningApp
!macroend

!macro customInit
  !insertmacro txcodeCleanupOldInstall HKEY_LOCAL_MACHINE "/allusers"
  !insertmacro txcodeCleanupOldInstall HKEY_CURRENT_USER "/currentuser"
!macroend

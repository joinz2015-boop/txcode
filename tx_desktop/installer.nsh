; ============================================================
; txcode 自定义 NSIS 钩子（electron-builder nsis.include）
;
; 目标：已安装旧版本时，双击新安装包可直接覆盖升级，无需手动卸载，
;       且从双击到安装向导出现之间**不得有任何无界面等待**。
;
; 【硬约束，修改前务必阅读】
;   1) customInit 运行在 .onInit 内（MUI 向导页面尚未创建），其中
;      **禁止**出现 ExecWait / Sleep / 进程回收等耗时动作，否则会回归
;      “双击后什么都不出现”的体验问题。它只允许做毫秒级注册表清理。
;   2) 进程回收、旧目录删除、旧版本注册表清理必须发生在安装 Section
;      （InstFiles 进度页可见）内，即 customCheckAppRunning 链路。
;   3) 本包不再执行旧版本卸载器：注册表清空后模板 uninstallOldVersion 直接 Return，
;      因此卸载器的 un.atomicRMDir（整树改名到 %TEMP%\~nsu.tmp\old-install，
;      任一文件改名失败即 Abort 返回 errorlevel=2）永不进入。
;   4) 禁止把安装目录改名到 $PLUGINSDIR（卸载器侧即 %TEMP%\~nsu.tmp 固定名目录）：
;      旧目录一律原地 RMDir /r，不进入固定名临时目录复用链路。
;   5) 所有新增 UI 提示必须包在 ${IfNot} ${Silent} 内，禁止新增 MessageBox，
;      以保证静默安装（/S）与无人值守升级无弹框。
;   6) 本文件同时被安装器与卸载器编译（CHECK_APP_RUNNING 两处都会插入），
;      宏内一律不使用 Var 与全局寄存器以外的状态；破坏性动作（删旧目录、清注册表）
;      与自管日志仅允许在安装器内执行（!ifndef BUILD_UNINSTALLER）。
;
; 自证与日志：本 NSIS 二进制未编译 NSIS_CONFIG_LOG，安装包的 /LOG= 参数无效，
;   故改为自管日志（均为用户可读的文本文件）：
;     %ProgramData%\txcode\install.log        —— 本次运行全过程（含 rev，单次运行覆盖写）
;     %ProgramData%\txcode\process-scan.log   —— 进程/文件占用扫描（追加写，由 PowerShell 写入）
;   修订号 TXCODE_NSIS_REV 每次改本文件必须递增，install.log 表头必须出现该值，
;   用于区分“修复已进包”与“装的是同名旧包”。
;   注意：本 NSIS 的 FileOpen 'a' 模式会截断文件，append 不可用，
;         install.log 全程复用同一个 'w' 句柄顺序写入（见 txcodeInitInstallLog）。
; ============================================================

!define TXCODE_NSIS_REV "20260912-210012"

; 升级关闭标记：安装器写入，应用侧（tx_desktop/main.js）检测到后静默退出，
; 避免弹出“最小化到托盘/退出应用”确认框阻塞覆盖安装。
; 双写：$TEMP（兼容旧版应用）+ ProgramData（提权/换账号后应用仍可读，
;       使用前必须先 SetShellVarContext all，见 txcodeWriteUpgradeMark）
!define TXCODE_UPGRADE_MARK "$TEMP\txcode-upgrade.lock"
!define TXCODE_UPGRADE_MARK_ALL_USERS "$APPDATA\txcode\upgrade.lock"

; 自管日志（$APPDATA 需在 SetShellVarContext all 语境下使用 = %ProgramData%）
!define TXCODE_LOG_FILE_ALL_USERS "$APPDATA\txcode\install.log"
!define TXCODE_SCAN_FILE_ALL_USERS "$APPDATA\txcode\process-scan.log"

; 进度页阶段文案（仅用于 {IfNot} ${Silent} 分支）
!define TXCODE_TEXT_STOPPING "正在关闭旧版本并释放文件占用，请稍候…"
!define TXCODE_TEXT_CLEANING "正在清理旧版本文件，请稍候…"
!define TXCODE_TEXT_UNINSTALLING "正在准备安装 txcode，请稍候…"
!define TXCODE_TEXT_INSTALLING "正在安装 txcode，请稍候…"
!define TXCODE_TEXT_LOCKED "检测到旧版本文件被占用，正在继续安装…"

; 按安装目录清理残留后端子进程：匹配 ExecutablePath 或 CommandLine 落在 $INSTDIR 下的
; node.exe / txcode.exe，最多重试 12 轮，并输出旧目录文件计数、每轮命中数与最终结果。
; 安装目录与日志路径通过 TXCODE_INSTALL_DIR / TXCODE_LOG_FILE 环境变量传入
; （EncodedCommand 后不允许再跟位置参数）。
!define TXCODE_KILL_LEFTOVER `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand JABFAHIAcgBvAHIAQQBjAHQAaQBvAG4AUAByAGUAZgBlAHIAZQBuAGMAZQAgAD0AIAAnAFMAaQBsAGUAbgB0AGwAeQBDAG8AbgB0AGkAbgB1AGUAJwANAAoAJABQAHIAbwBnAHIAZQBzAHMAUAByAGUAZgBlAHIAZQBuAGMAZQAgAD0AIAAnAFMAaQBsAGUAbgB0AGwAeQBDAG8AbgB0AGkAbgB1AGUAJwANAAoAJABsAG8AZwAgAD0AIAAkAGUAbgB2ADoAVABYAEMATwBEAEUAXwBMAE8ARwBfAEYASQBMAEUADQAKAGYAdQBuAGMAdABpAG8AbgAgAFcAcgBpAHQAZQAtAEwAbwBnACgAWwBzAHQAcgBpAG4AZwBdACQAbQBlAHMAcwBhAGcAZQApACAAewANAAoAIAAgAFcAcgBpAHQAZQAtAE8AdQB0AHAAdQB0ACAAJABtAGUAcwBzAGEAZwBlAA0ACgAgACAAaQBmACAAKAAtAG4AbwB0ACAAWwBzAHQAcgBpAG4AZwBdADoAOgBJAHMATgB1AGwAbABPAHIARQBtAHAAdAB5ACgAJABsAG8AZwApACkAIAB7AA0ACgAgACAAIAAgAEEAZABkAC0AQwBvAG4AdABlAG4AdAAgAC0ATABpAHQAZQByAGEAbABQAGEAdABoACAAJABsAG8AZwAgAC0AVgBhAGwAdQBlACAAJABtAGUAcwBzAGEAZwBlACAALQBFAG4AYwBvAGQAaQBuAGcAIABEAGUAZgBhAHUAbAB0AA0ACgAgACAAfQANAAoAfQANAAoAVwByAGkAdABlAC0ATABvAGcAIAAoACcAWwB0AHgAYwBvAGQAZQBdACAAcAByAG8AYwBlAHMAcwAgAHMAYwBhAG4AIABzAHQAYQByAHQAOgAgACcAIAArACAAKABHAGUAdAAtAEQAYQB0AGUAKQAuAFQAbwBTAHQAcgBpAG4AZwAoACcAeQB5AHkAeQAtAE0ATQAtAGQAZAAgAEgASAA6AG0AbQA6AHMAcwAnACkAKQANAAoAJABkAGkAcgAgAD0AIAAkAGUAbgB2ADoAVABYAEMATwBEAEUAXwBJAE4AUwBUAEEATABMAF8ARABJAFIADQAKAGkAZgAgACgAWwBzAHQAcgBpAG4AZwBdADoAOgBJAHMATgB1AGwAbABPAHIARQBtAHAAdAB5ACgAJABkAGkAcgApACkAIAB7AA0ACgAgACAAVwByAGkAdABlAC0ATABvAGcAIAAnAFsAdAB4AGMAbwBkAGUAXQAgAHAAcgBvAGMAZQBzAHMAIABzAGMAYQBuACAAcwBrAGkAcABwAGUAZAA6ACAAbgBvACAAaQBuAHMAdABhAGwAbAAgAGQAaQByACcADQAKACAAIABlAHgAaQB0ACAAMAANAAoAfQANAAoAJABkAGkAcgAgAD0AIAAkAGQAaQByAC4AVAByAGkAbQBFAG4AZAAoAFsAYwBoAGEAcgBdADkAMgApAA0ACgBXAHIAaQB0AGUALQBMAG8AZwAgACgAJwBbAHQAeABjAG8AZABlAF0AIABzAGMAYQBuACAAaQBuAHMAdABhAGwAbAAgAGQAaQByADoAIAAnACAAKwAgACQAZABpAHIAKQANAAoAaQBmACAAKABUAGUAcwB0AC0AUABhAHQAaAAgAC0ATABpAHQAZQByAGEAbABQAGEAdABoACAAJABkAGkAcgApACAAewANAAoAIAAgACQAYwBvAHUAbgB0ACAAPQAgAEAAKABHAGUAdAAtAEMAaABpAGwAZABJAHQAZQBtACAALQBMAGkAdABlAHIAYQBsAFAAYQB0AGgAIAAkAGQAaQByACAALQBSAGUAYwB1AHIAcwBlACAALQBGAG8AcgBjAGUAIAAtAEUAcgByAG8AcgBBAGMAdABpAG8AbgAgAFMAaQBsAGUAbgB0AGwAeQBDAG8AbgB0AGkAbgB1AGUAKQAuAEMAbwB1AG4AdAANAAoAIAAgAFcAcgBpAHQAZQAtAEwAbwBnACAAKAAnAFsAdAB4AGMAbwBkAGUAXQAgAHAAcgBlAHYAaQBvAHUAcwAgAGkAbgBzAHQAYQBsAGwAIABmAGkAbABlACAAYwBvAHUAbgB0ADoAIAAnACAAKwAgACQAYwBvAHUAbgB0ACkADQAKAH0AIABlAGwAcwBlACAAewANAAoAIAAgAFcAcgBpAHQAZQAtAEwAbwBnACAAJwBbAHQAeABjAG8AZABlAF0AIABwAHIAZQB2AGkAbwB1AHMAIABpAG4AcwB0AGEAbABsACAAZgBpAGwAZQAgAGMAbwB1AG4AdAA6ACAAMAAgACgAZABpAHIAIABuAG8AdAAgAGYAbwB1AG4AZAApACcADQAKAH0ADQAKACQAdABvAHQAYQBsACAAPQAgADAADQAKAGYAbwByACAAKAAkAGkAIAA9ACAAMAA7ACAAJABpACAALQBsAHQAIAAxADIAOwAgACQAaQArACsAKQAgAHsADQAKACAAIAAkAGwAZQBmAHQAbwB2AGUAcgAgAD0AIABAACgARwBlAHQALQBDAGkAbQBJAG4AcwB0AGEAbgBjAGUAIABXAGkAbgAzADIAXwBQAHIAbwBjAGUAcwBzACAAfAAgAFcAaABlAHIAZQAtAE8AYgBqAGUAYwB0ACAAewANAAoAIAAgACAAIAAoACQAXwAuAE4AYQBtAGUAIAAtAGUAcQAgACcAbgBvAGQAZQAuAGUAeABlACcAIAAtAG8AcgAgACQAXwAuAE4AYQBtAGUAIAAtAGUAcQAgACcAdAB4AGMAbwBkAGUALgBlAHgAZQAnACkAIAAtAGEAbgBkACAAKAAoACQAXwAuAEUAeABlAGMAdQB0AGEAYgBsAGUAUABhAHQAaAAgAC0AYQBuAGQAIAAkAF8ALgBFAHgAZQBjAHUAdABhAGIAbABlAFAAYQB0AGgALgBTAHQAYQByAHQAcwBXAGkAdABoACgAJABkAGkAcgAsACAAJwBPAHIAZABpAG4AYQBsAEkAZwBuAG8AcgBlAEMAYQBzAGUAJwApACkAIAAtAG8AcgAgACgAJABfAC4AQwBvAG0AbQBhAG4AZABMAGkAbgBlACAALQBhAG4AZAAgACQAXwAuAEMAbwBtAG0AYQBuAGQATABpAG4AZQAuAEkAbgBkAGUAeABPAGYAKAAkAGQAaQByACwAIAAnAE8AcgBkAGkAbgBhAGwASQBnAG4AbwByAGUAQwBhAHMAZQAnACkAIAAtAGcAZQAgADAAKQApAA0ACgAgACAAfQApAA0ACgAgACAAaQBmACAAKAAkAGwAZQBmAHQAbwB2AGUAcgAuAEMAbwB1AG4AdAAgAC0AZQBxACAAMAApACAAewANAAoAIAAgACAAIABXAHIAaQB0AGUALQBMAG8AZwAgACgAJwBbAHQAeABjAG8AZABlAF0AIABsAGUAZgB0AG8AdgBlAHIAIABwAHIAbwBjAGUAcwBzAGUAcwA6ACAAMAAgACgAYwBsAGUAYQBuACkALAAgAGsAaQBsAGwAZQBkAD0AJwAgACsAIAAkAHQAbwB0AGEAbAApAA0ACgAgACAAIAAgAGUAeABpAHQAIAAwAA0ACgAgACAAfQANAAoAIAAgAFcAcgBpAHQAZQAtAEwAbwBnACAAKAAnAFsAdAB4AGMAbwBkAGUAXQAgAGwAZQBmAHQAbwB2AGUAcgAgAHAAcgBvAGMAZQBzAHMAZQBzADoAIAAnACAAKwAgACQAbABlAGYAdABvAHYAZQByAC4AQwBvAHUAbgB0ACkADQAKACAAIABmAG8AcgBlAGEAYwBoACAAKAAkAHAAIABpAG4AIAAkAGwAZQBmAHQAbwB2AGUAcgApACAAewANAAoAIAAgACAAIABXAHIAaQB0AGUALQBMAG8AZwAgACgAJwBbAHQAeABjAG8AZABlAF0AIAAgACAAawBpAGwAbAAgACcAIAArACAAJABwAC4ATgBhAG0AZQAgACsAIAAnACAAcABpAGQAPQAnACAAKwAgACQAcAAuAFAAcgBvAGMAZQBzAHMASQBkACAAKwAgACcAIABwAGEAdABoAD0AJwAgACsAIAAkAHAALgBFAHgAZQBjAHUAdABhAGIAbABlAFAAYQB0AGgAKQANAAoAIAAgACAAIAB0AGEAcwBrAGsAaQBsAGwALgBlAHgAZQAgAC8ARgAgAC8AVAAgAC8AUABJAEQAIAAkAHAALgBQAHIAbwBjAGUAcwBzAEkAZAAgADIAPgAmADEAIAB8ACAATwB1AHQALQBOAHUAbABsAA0ACgAgACAAIAAgACQAdABvAHQAYQBsACsAKwANAAoAIAAgAH0ADQAKACAAIABTAHQAYQByAHQALQBTAGwAZQBlAHAAIAAtAE0AaQBsAGwAaQBzAGUAYwBvAG4AZABzACAAMwAwADAADQAKAH0ADQAKAFcAcgBpAHQAZQAtAEwAbwBnACAAKAAnAFsAdAB4AGMAbwBkAGUAXQAgAGwAZQBmAHQAbwB2AGUAcgAgAHAAcgBvAGMAZQBzAHMAZQBzACAAcgBlAG0AYQBpAG4AIABhAGYAdABlAHIAIAByAGUAdAByAGkAZQBzACwAIABrAGkAbABsAGUAZAA9ACcAIAArACAAJAB0AG8AdABhAGwAKQANAAoAZQB4AGkAdAAgADAADQAKAA==`

Var txcodeLogPath
Var txcodeScanPath
Var txcodeLogHandle

; 退出/卸载器分支需还原 SetShellVarContext，避免影响模板后续的快捷方式创建
!macro txcodeRestoreShellVarContext
  ${if} $installMode == "all"
    SetShellVarContext all
  ${else}
    SetShellVarContext current
  ${endif}
!macroend

; 写日志：同时进“显示详细信息”列表与自管日志文件（仅安装器，$txcodeLogPath 为空时只进列表）
!macro txcodeLog _TEXT
  DetailPrint "${_TEXT}"
  ${if} $txcodeLogPath != ""
    ClearErrors
    FileWrite $txcodeLogHandle "${_TEXT}$\r$\n"
  ${endif}
!macroend

; 解析日志路径（ProgramData 优先，不可写时退回 $TEMP）并写入本次运行的表头
!macro txcodeInitInstallLog
  SetShellVarContext all
  CreateDirectory "$APPDATA\txcode"
  StrCpy $txcodeLogPath "${TXCODE_LOG_FILE_ALL_USERS}"
  StrCpy $txcodeScanPath "${TXCODE_SCAN_FILE_ALL_USERS}"
  !insertmacro txcodeRestoreShellVarContext

  ClearErrors
  FileOpen $txcodeLogHandle "$txcodeLogPath" w
  ${if} ${errors}
    StrCpy $txcodeLogPath "$TEMP\txcode-install.log"
    StrCpy $txcodeScanPath "$TEMP\txcode-process-scan.log"
    ClearErrors
    FileOpen $txcodeLogHandle "$txcodeLogPath" w
    ${if} ${errors}
      StrCpy $txcodeLogPath ""
      StrCpy $txcodeScanPath ""
    ${endif}
  ${endif}

  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  !insertmacro txcodeLog "========== txcode install run | rev ${TXCODE_NSIS_REV} | installer ${VERSION} | $2-$1-$0 $4:$5:$6 =========="
  !insertmacro txcodeLog "[txcode] install dir: $INSTDIR"
  !insertmacro txcodeLog "[txcode] temp dir: $TEMP"
  !insertmacro txcodeLog "[txcode] log file: $txcodeLogPath"
  !insertmacro txcodeLog "[txcode] process scan log: $txcodeScanPath"
!macroend

!macro txcodeCloseInstallLog
  ${if} $txcodeLogPath != ""
    FileClose $txcodeLogHandle
    StrCpy $txcodeLogPath ""
  ${endif}
!macroend

; 双写升级标记（$TEMP + ProgramData，失败不影响安装流程）
!macro txcodeWriteUpgradeMark
  ClearErrors
  FileOpen $R8 "${TXCODE_UPGRADE_MARK}" w
  ${ifNot} ${errors}
    FileWrite $R8 "upgrade"
    FileClose $R8
    !insertmacro txcodeLog "[txcode] upgrade mark written: ${TXCODE_UPGRADE_MARK}"
  ${endif}

  SetShellVarContext all
  CreateDirectory "$APPDATA\txcode"
  ClearErrors
  FileOpen $R8 "${TXCODE_UPGRADE_MARK_ALL_USERS}" w
  ${ifNot} ${errors}
    FileWrite $R8 "upgrade"
    FileClose $R8
    !insertmacro txcodeLog "[txcode] upgrade mark written: ${TXCODE_UPGRADE_MARK_ALL_USERS}"
  ${endif}
  !insertmacro txcodeRestoreShellVarContext
!macroend

!macro txcodeDeleteUpgradeMark
  ClearErrors
  ${if} ${FileExists} "${TXCODE_UPGRADE_MARK}"
    Delete "${TXCODE_UPGRADE_MARK}"
  ${endif}

  SetShellVarContext all
  ${if} ${FileExists} "${TXCODE_UPGRADE_MARK_ALL_USERS}"
    Delete "${TXCODE_UPGRADE_MARK_ALL_USERS}"
  ${endif}
  !insertmacro txcodeRestoreShellVarContext
!macroend

; 改写安装向导进度页的阶段文字（控件 ID 1000 与模板 one-click 分支同一手法）。
; 依赖 $hwndparent；未命中时静默退化，不影响功能，只影响提示强度。
!macro txcodeSetStageText _TEXT
  ${IfNot} ${Silent}
    FindWindow $R4 "#32770" "" $hwndparent
    FindWindow $R4 "#32770" "" $hwndparent $R4
    GetDlgItem $R4 $R4 1000
    SendMessage $R4 ${WM_SETTEXT} 0 "STR:${_TEXT}"
  ${endif}
!macroend

; 安装目录与扫描日志路径写入环境变量，供清理脚本读取（System::Call 直接用 W 导出函数）
!macro txcodeSetScanEnv
  System::Call 'kernel32::SetEnvironmentVariableW(w "TXCODE_INSTALL_DIR", w "$INSTDIR")'
  System::Call 'kernel32::SetEnvironmentVariableW(w "TXCODE_LOG_FILE", w "$txcodeScanPath")'
!macroend

; 失败不中断：列出仍被占用的关键文件（仅写日志，静默模式同样无弹窗）
!macro txcodeLogLockedFiles
  !insertmacro txcodeLog "[txcode] locked file check in $INSTDIR:"
  ${if} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    !insertmacro txcodeLog "[txcode]   locked: $INSTDIR\${APP_EXECUTABLE_FILENAME}"
  ${endif}
  ${if} ${FileExists} "$INSTDIR\resources\app.asar"
    !insertmacro txcodeLog "[txcode]   locked: $INSTDIR\resources\app.asar"
  ${endif}
  ${if} ${FileExists} "$INSTDIR\resources\app\package.json"
    !insertmacro txcodeLog "[txcode]   locked: $INSTDIR\resources\app\package.json"
  ${endif}
!macroend

; 关闭正在运行的旧版本：升级标记 + --quit 第二通道 → 轮询等待自然退出（6s）
; → 温和关闭 → 强杀进程树 → 按安装目录清理残留子进程 → 等待句柄释放
!macro txcodeStopRunningApp
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    !insertmacro txcodeSetStageText "${TXCODE_TEXT_STOPPING}"

    ; 升级标记必须在关闭旧应用之前写入，让 main.js 静默关窗（不弹托盘确认框）
    !insertmacro txcodeWriteUpgradeMark

    !insertmacro txcodeLog "[txcode] closing running ${PRODUCT_NAME}, install dir: $INSTDIR"

    ; 第二通道：让旧应用主动退出（main.js 解析 --quit 后静默 quit，含后端清理）
    ${if} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
      !insertmacro txcodeLog "[txcode] requesting --quit from $INSTDIR\${APP_EXECUTABLE_FILENAME}"
      nsExec::ExecToLog '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --quit'
    ${endif}

    ; 轮询确认自然退出（300ms x 20 = 最长 6000ms，与 main.js 的 6s 清理护栏对齐）
    StrCpy $R1 0
    txcodeWaitProcessGone:
      Sleep 300
      IntOp $R1 $R1 + 1
      ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
      ${if} $R0 != 0
        Goto txcodeProcessGone
      ${endif}
      ${if} $R1 < 20
        Goto txcodeWaitProcessGone
      ${endif}

      !insertmacro txcodeLog "[txcode] graceful quit timeout, requesting close..."
      nsExec::ExecToLog 'taskkill /IM "${APP_EXECUTABLE_FILENAME}"'

      ; 温和关闭后继续轮询（300ms x 7 ≈ 2000ms），命中即继续
      StrCpy $R2 0
      txcodeWaitCloseRequest:
        Sleep 300
        IntOp $R2 $R2 + 1
        ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
        ${if} $R0 != 0
          Goto txcodeProcessGone
        ${endif}
        ${if} $R2 < 7
          Goto txcodeWaitCloseRequest
        ${endif}

        !insertmacro txcodeLog "[txcode] force killing ${PRODUCT_NAME} process tree..."
        nsExec::ExecToLog 'taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'

        ; 强杀后仍轮询确认（300ms x 7 ≈ 2000ms），命中即继续
        StrCpy $R3 0
        txcodeWaitForceKill:
          Sleep 300
          IntOp $R3 $R3 + 1
          ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
          ${if} $R0 != 0
            Goto txcodeProcessGone
          ${endif}
          ${if} $R3 < 7
            Goto txcodeWaitForceKill
          ${endif}
          !insertmacro txcodeLog "[txcode] ${PRODUCT_NAME} is still running, installation continues anyway."

    txcodeProcessGone:
      !insertmacro txcodeLog "[txcode] ${PRODUCT_NAME} is no longer running, releasing file handles..."
  ${endif}

  ; 清理残留后端子进程（主进程已被强杀、仅剩 node 模式子进程的场景），
  ; 同一脚本记录旧安装目录文件计数与每轮进程命中数到 process-scan.log
  !insertmacro txcodeSetScanEnv
  nsExec::ExecToLog '${TXCODE_KILL_LEFTOVER}'

  ; 留出句柄释放时间，降低后续删除与复制阶段踩锁概率
  Sleep 500

  !insertmacro txcodeDeleteUpgradeMark
!macroend

; 原地删除旧安装目录（守卫：目录内存在 txcode.exe 且路径长度合理，防误删盘根）
!macro txcodeRemoveOldInstall
  ${if} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    StrLen $R6 $INSTDIR
    ${if} $R6 > 12
      !insertmacro txcodeSetStageText "${TXCODE_TEXT_CLEANING}"
      !insertmacro txcodeLog "[txcode] previous install detected, removing files in place: $INSTDIR"
      ClearErrors
      RMDir /r "$INSTDIR"

      ${if} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
        !insertmacro txcodeLog "[txcode] leftover files are locked, new files will overwrite them"
        !insertmacro txcodeLogLockedFiles
        !insertmacro txcodeSetStageText "${TXCODE_TEXT_LOCKED}"
      ${else}
        !insertmacro txcodeLog "[txcode] previous install dir removed"
      ${endif}
    ${else}
      !insertmacro txcodeLog "[txcode] install dir path too short, skip removal: $INSTDIR"
    ${endif}
  ${else}
    !insertmacro txcodeLog "[txcode] no previous installation at $INSTDIR, skip removal"
  ${endif}
!macroend

; 清空旧版本注册表记录（含 UNINSTALL_REGISTRY_KEY_2）：模板 uninstallOldVersion
; 读到 UninstallString 为空即 ClearErrors + Return，卸载重试循环与
; $(appCannotBeClosed) 弹窗不可达
!macro txcodeClearInstallRegistry _HIVE
  ClearErrors
  ReadRegStr $0 ${_HIVE} "${UNINSTALL_REGISTRY_KEY}" UninstallString
  ReadRegStr $1 ${_HIVE} "${INSTALL_REGISTRY_KEY}" InstallLocation

  ${if} $0 != ""
  ${orIf} $1 != ""
    !insertmacro txcodeLog "[txcode] clearing registry (${_HIVE}): UninstallString=$0 InstallLocation=$1"
    DeleteRegKey ${_HIVE} "${UNINSTALL_REGISTRY_KEY}"
    !ifdef UNINSTALL_REGISTRY_KEY_2
      DeleteRegKey ${_HIVE} "${UNINSTALL_REGISTRY_KEY_2}"
    !endif
    DeleteRegKey ${_HIVE} "${INSTALL_REGISTRY_KEY}"
  ${else}
    !insertmacro txcodeLog "[txcode] no registry record to clear (${_HIVE})"
  ${endif}
!macroend

; 清理一个注册表分支下失效的旧安装记录（安装目录或卸载器已缺失）。
; 纯注册表操作，耗时毫秒级，可安全用于 .onInit 的 customInit。
!macro txcodeCleanupStaleRegistry _HIVE _MODE
  ClearErrors
  ReadRegStr $0 ${_HIVE} "${INSTALL_REGISTRY_KEY}" InstallLocation
  ReadRegStr $1 ${_HIVE} "${UNINSTALL_REGISTRY_KEY}" UninstallString

  ${if} $0 != ""
  ${orIf} $1 != ""
    StrCpy $2 "$0\${UNINSTALL_FILENAME}"
    ${if} $0 == ""
    ${orIfNot} ${FileExists} "$2"
      DetailPrint "[txcode] cleaning stale registry (${_HIVE})..."
      DeleteRegKey ${_HIVE} "${UNINSTALL_REGISTRY_KEY}"
      !ifdef UNINSTALL_REGISTRY_KEY_2
        DeleteRegKey ${_HIVE} "${UNINSTALL_REGISTRY_KEY_2}"
      !endif
      DeleteRegKey ${_HIVE} "${INSTALL_REGISTRY_KEY}"
    ${else}
      DetailPrint "[txcode] previous installation found at $0 (${_HIVE})"
    ${endif}
  ${endif}
!macroend

; 主动静默卸载旧版本（特殊场景显式复用；默认链路不再调用旧卸载器）
!macro txcodeSilentUninstall _HIVE _MODE
  ClearErrors
  ReadRegStr $0 ${_HIVE} "${INSTALL_REGISTRY_KEY}" InstallLocation
  ReadRegStr $1 ${_HIVE} "${UNINSTALL_REGISTRY_KEY}" UninstallString

  ${if} $0 != ""
  ${orIf} $1 != ""
    StrCpy $2 "$0\${UNINSTALL_FILENAME}"
    ${if} $0 == ""
    ${orIfNot} ${FileExists} "$2"
      DetailPrint "[txcode] cleaning stale registry (${_HIVE})..."
      DeleteRegKey ${_HIVE} "${UNINSTALL_REGISTRY_KEY}"
      DeleteRegKey ${_HIVE} "${INSTALL_REGISTRY_KEY}"
    ${else}
      DetailPrint "[txcode] uninstalling previous ${PRODUCT_NAME} (${_HIVE})..."
      !insertmacro txcodeWriteUpgradeMark

      ClearErrors
      ExecWait '"$2" /S /KEEP_APP_DATA ${_MODE} --updated _?=$0' $3
      ${if} $3 != 0
      ${orIf} ${errors}
        ; 旧卸载器失败（文件被占用）：清理进程后重试一次
        DetailPrint "[txcode] previous uninstaller failed with code $3, retry after killing processes..."
        !insertmacro txcodeStopRunningApp

        ClearErrors
        ExecWait '"$2" /S /KEEP_APP_DATA ${_MODE} --updated _?=$0' $3
      ${endif}
      ${if} $3 != 0
      ${orIf} ${errors}
        ; 仍失败则清理注册表继续安装：模板的 uninstallOldVersion 随之成为空操作
        DetailPrint "[txcode] previous uninstaller still failed with code $3, clean registry and continue."
        DeleteRegKey ${_HIVE} "${UNINSTALL_REGISTRY_KEY}"
        DeleteRegKey ${_HIVE} "${INSTALL_REGISTRY_KEY}"
      ${endif}

      !insertmacro txcodeDeleteUpgradeMark
    ${endif}
  ${endif}
!macroend

; 安装 Section 内的旧版本清理（父方案能力）：进度页可见时执行，替代 .onInit 内的静默等待
!macro customCheckAppRunning
  ${IfNot} ${Silent}
    ; 模板已在 installSection.nsh 执行 SetDetailsPrint none，此处重新打开细节输出，
    ; 让 DetailPrint 进入“显示详细信息”列表（SetDetailsPrint 不可依赖全局设置）
    SetDetailsPrint listonly

    ; 与模板 one-click 分支同款手法：安装期间阻止系统关机
    StrCpy $R4 $hwndparent
    System::Call 'user32::ShutdownBlockReasonCreate(p r4, w "${TXCODE_TEXT_STOPPING}")'
  ${endif}

  !ifdef BUILD_UNINSTALLER
    ; 卸载器编译不使用自管日志（install.log 由安装器写入），此处仅初始化变量
    StrCpy $txcodeLogPath ""
    StrCpy $txcodeScanPath ""
    StrCpy $txcodeLogHandle ""
  !else
    !insertmacro txcodeInitInstallLog
  !endif

  !insertmacro txcodeLog "[txcode] nsis rev: ${TXCODE_NSIS_REV}"

  !insertmacro txcodeStopRunningApp

  !ifndef BUILD_UNINSTALLER
    !insertmacro txcodeRemoveOldInstall
    !insertmacro txcodeClearInstallRegistry HKEY_LOCAL_MACHINE
    !insertmacro txcodeClearInstallRegistry HKEY_CURRENT_USER
  !endif

  !insertmacro txcodeSetStageText "${TXCODE_TEXT_UNINSTALLING}"
!macroend

; .onInit 内执行：只做毫秒级清理，严禁耗时动作（见文件顶部硬约束 1）
!macro customInit
  ; 清理历史残留的升级标记，避免上一次异常中断影响本次升级（main.js 据此静默退出）
  !insertmacro txcodeDeleteUpgradeMark

  DetailPrint "[txcode] nsis rev: ${TXCODE_NSIS_REV}"

  ; 清理失效的注册表残留，避免随后模板 uninstallOldVersion 触发 uninstallFailed
  !insertmacro txcodeCleanupStaleRegistry HKEY_LOCAL_MACHINE "/allusers"
  !insertmacro txcodeCleanupStaleRegistry HKEY_CURRENT_USER "/currentuser"

  DetailPrint "[txcode] pre-init cleanup done"
!macroend

; 旧卸载器返回非 0 / 无法启动时接管模板的失败弹窗与 Quit：
; 记录返回码 + 清理注册表 + 继续安装（等价承接父方案“失败不中断”）
!macro customUnInstallCheck
  ${if} $R0 != 0
    !insertmacro txcodeLog "[txcode] old uninstaller returned $R0, cleaning registry and continue"
    DeleteRegKey SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}"
    DeleteRegKey SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}"
  ${else}
    !insertmacro txcodeLog "[txcode] old version uninstalled"
  ${endif}
!macroend

; per-user 旧版本分支（installUtil.nsh 117-121 行）必须单独定义，否则仍会 Quit
!macro customUnInstallCheckCurrentUser
  ${if} $R0 != 0
    !insertmacro txcodeLog "[txcode] old uninstaller (current user) returned $R0, cleaning registry and continue"
    DeleteRegKey HKEY_CURRENT_USER "${UNINSTALL_REGISTRY_KEY}"
    DeleteRegKey HKEY_CURRENT_USER "${INSTALL_REGISTRY_KEY}"
  ${else}
    !insertmacro txcodeLog "[txcode] old version (current user) uninstalled"
  ${endif}
!macroend

; 卸载器侧修根：不再使用 un.atomicRMDir（整树改名到 %TEMP%\~nsu.tmp\old-install，
; 任一文件改名失败即 Abort 并返回 errorlevel=2），改为原地删除。
; 收益从 1.0.61 → 之后的升级开始体现（升级时执行的是上一版卸载器）。
!macro customRemoveFiles
  !insertmacro txcodeLog "[txcode] removing application files in place: $INSTDIR"
  RMDir /r "$INSTDIR"
!macroend

; 文件复制完成后的收尾：恢复常规阶段文案、关闭日志句柄并输出日志
!macro customInstall
  !insertmacro txcodeSetStageText "${TXCODE_TEXT_INSTALLING}"
  ${IfNot} ${Silent}
    StrCpy $R4 $hwndparent
    System::Call 'user32::ShutdownBlockReasonDestroy(p r4)'
  ${endif}
  !insertmacro txcodeLog "[txcode] application files copied, finishing installation..."
  !ifndef BUILD_UNINSTALLER
    !insertmacro txcodeCloseInstallLog
  !endif
!macroend

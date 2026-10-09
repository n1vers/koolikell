!include nsDialogs.nsh
!include LogicLib.nsh

!ifdef BUILD_UNINSTALLER
Var un.DeleteUserDataCheckbox

Function un.ShowUserDataChoice
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Выберите, нужно ли удалить пользовательские данные приложения."
  Pop $0

  ${NSD_CreateCheckbox} 0 30u 100% 12u "Удалить профили, базу данных и загруженные звуки"
  Pop $un.DeleteUserDataCheckbox
  ${NSD_SetState} $un.DeleteUserDataCheckbox ${BST_UNCHECKED}

  nsDialogs::Show
FunctionEnd
!endif

!macro customUnInit
  !ifdef BUILD_UNINSTALLER
    Call un.ShowUserDataChoice
  !endif
!macroend

!macro customUnInstall
  !ifdef BUILD_UNINSTALLER
    ${NSD_GetState} $un.DeleteUserDataCheckbox $0
    ${If} $0 == ${BST_CHECKED}
      ${if} $installMode == "all"
        SetShellVarContext current
      ${endif}
      RMDir /r "$APPDATA\${APP_FILENAME}"
      !ifdef APP_PRODUCT_FILENAME
        RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
      !endif
      !ifdef APP_PACKAGE_NAME
        RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
      !endif
      ${if} $installMode == "all"
        SetShellVarContext all
      ${endif}
    ${EndIf}
  !endif
!macroend

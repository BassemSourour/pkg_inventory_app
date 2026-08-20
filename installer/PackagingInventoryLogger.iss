; Inno Setup script for Packaging Inventory Logger.
;
; Per-user install: no administrator password is required, the app
; lands in the user profile, and the counts stay in LocalAppData.
;
; Build with tools\build.ps1 rather than compiling this by hand,
; so the version stays in step with app/config.py.

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

#define AppName "Packaging Inventory Logger"
#define AppFolderName "PackagingInventoryLogger"
#define AppPublisher "Reunion Coffee Roasters"
#define AppExeName "PackagingInventoryLogger.exe"

[Setup]
; Changing AppId turns upgrades into second installs. Leave it alone.
AppId={{8C3F1B42-5D6E-4A79-9E21-7B4C0D8F1A63}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
VersionInfoVersion={#AppVersion}

; PrivilegesRequired=lowest is what keeps this a per-user install.
; With it set, {autopf} resolves to {localappdata}\Programs.
PrivilegesRequired=lowest
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
DisableDirPage=auto

; Offer to close a running copy instead of failing on a locked file.
; Must match SINGLE_INSTANCE_MUTEX_NAME in run.py.
AppMutex=PackagingInventoryLoggerMutex
CloseApplications=yes
RestartApplications=no

OutputDir=..\installer_output
OutputBaseFilename={#AppFolderName}-Setup-{#AppVersion}
SetupIconFile=..\assets\icon.ico
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}

WizardStyle=modern
Compression=lzma2/max
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"

[Files]
Source: "..\dist\{#AppFolderName}\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\{#AppFolderName}\_internal\*"; DestDir: "{app}\_internal"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Start {#AppName}"; Flags: nowait postinstall skipifsilent

[Code]
// Counts and the workbook live outside {app}, so uninstalling does
// not touch them unless the operator explicitly says so.
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DataDir := ExpandConstant('{localappdata}\{#AppFolderName}');

    if DirExists(DataDir) then
    begin
      // SuppressibleMsgBox, not MsgBox: a plain MsgBox is shown even
      // during a silent uninstall, which would hang it forever with
      // no one there to answer. Silent runs keep the data.
      if SuppressibleMsgBox(
           'Also delete the saved inventory counts and workbook?' + #13#10 + #13#10 +
           DataDir + #13#10 + #13#10 +
           'Choose No to keep them for a future install.',
           mbConfirmation,
           MB_YESNO or MB_DEFBUTTON2,
           IDNO
         ) = IDYES then
      begin
        DelTree(DataDir, True, True, True);
      end;
    end;
  end;
end;

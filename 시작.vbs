Set WshShell = CreateObject("WScript.Shell")
' 0 = Hide window (완전 무음 백그라운드 실행)
' False = 비동기 즉시 반환
WshShell.Run Chr(34) & WshShell.CurrentDirectory & "\CertificateAutomation.exe" & Chr(34), 0, False

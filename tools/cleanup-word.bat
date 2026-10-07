@echo off
chcp 65001 >nul
echo Markdown2Word: removing the leftover SMB share and catalog folder (one UAC prompt)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command','Remove-SmbShare -Name md2word-catalog -Force -ErrorAction SilentlyContinue; Remove-Item C:\md2word-catalog -Recurse -Force -ErrorAction SilentlyContinue; Write-Output CLEANED; Start-Sleep 2'"

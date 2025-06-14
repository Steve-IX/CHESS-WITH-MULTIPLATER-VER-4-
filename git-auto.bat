@echo off
REM Quick git auto-push batch file for Chess Project
REM Usage: git-auto.bat [optional commit message]

if "%~1"=="" (
    powershell -ExecutionPolicy Bypass -File git-auto.ps1
) else (
    powershell -ExecutionPolicy Bypass -File git-auto.ps1 -CommitMessage "%*"
) 
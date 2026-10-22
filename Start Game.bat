@echo off
REM Double-click this file to run the birthday game properly (not file://).
REM It starts a tiny local server and opens the game in your browser.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"

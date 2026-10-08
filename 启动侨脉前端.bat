@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py scripts\serve_frontend.py
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  python scripts\serve_frontend.py
  goto :eof
)
echo [侨脉] 未找到 Python。请安装 Python 3 后重试。
pause

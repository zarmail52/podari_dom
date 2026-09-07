@echo off
chcp 65001 >nul
title Автосинхронизация с GitHub
echo ============================================
echo   Автосинхронизация проекта с GitHub
echo ============================================
echo.

rem --- Поиск Git: сначала в PATH, затем в стандартных местах установки ---
set "GIT="
where git >nul 2>nul
if %errorlevel%==0 (
  for /f "delims=" %%I in ('where git') do (
    set "GIT=%%I"
    goto :git_found
  )
)

if not defined GIT if exist "C:\Program Files\Git\cmd\git.exe" set "GIT=C:\Program Files\Git\cmd\git.exe"
if not defined GIT if exist "C:\Program Files (x86)\Git\cmd\git.exe" set "GIT=C:\Program Files (x86)\Git\cmd\git.exe"
if not defined GIT if exist "%LocalAppData%\Programs\Git\cmd\git.exe" set "GIT=%LocalAppData%\Programs\Git\cmd\git.exe"
if not defined GIT if exist "%UserProfile%\AppData\Local\Programs\Git\cmd\git.exe" set "GIT=%UserProfile%\AppData\Local\Programs\Git\cmd\git.exe"

:git_found
if not defined GIT (
  echo [ОШИБКА] Git не найден. Установите Git с https://git-scm.com/ или укажите путь вручную.
  pause
  exit /b 1
)

echo [ИНФО] Используется Git: %GIT%
echo.

cd /d "%~dp0"

echo [1/4] Добавление изменений...
"%GIT%" add -A
if errorlevel 1 goto :error

echo [2/4] Создание коммита...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value ^| find "="') do set "DT=%%I"
set "STAMP=%DT:~6,2%.%DT:~4,2%.%DT:~0,4% %DT:~8,2%:%DT:~10,2%"
"%GIT%" commit -m "Автосинхронизация: %STAMP%"
if errorlevel 1 (
  echo.
  echo [ИНФО] Нечего коммитить - изменения отсутствуют.
  goto :done
)

echo [3/4] Получение обновлений с сервера...
"%GIT%" pull --rebase origin main
if errorlevel 1 goto :error

echo [4/4] Отправка изменений на GitHub...
"%GIT%" push origin main
if errorlevel 1 goto :error

goto :done

:error
echo.
echo [ОШИБКА] Синхронизация не удалась. Проверьте подключение к интернету и права доступа.
pause
exit /b 1

:done
echo.
echo ============================================
echo   Синхронизация завершена успешно!
echo ============================================
pause
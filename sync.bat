@echo off
chcp 65001 >nul
title Автосинхронизация с GitHub
echo ============================================
echo   Автосинхронизация проекта с GitHub
echo ============================================
echo.

set "GIT=C:\Users\Обучающийся\AppData\Local\Programs\Git\cmd\git.exe"

if not exist "%GIT%" (
  echo [ОШИБКА] Git не найден по пути: %GIT%
  pause
  exit /b 1
)

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
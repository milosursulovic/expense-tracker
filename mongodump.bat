@echo off
set DATESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%
set DATESTAMP=%DATESTAMP: =0%

set BACKUP_DIR=C:\MongoBackups\%DATESTAMP%
set BACKUP_ZIP=C:\MongoBackups\mongo_backup_%DATESTAMP%.zip
set MONGO_BIN="C:\Program Files\MongoDB\Server\8.0\bin"

:: 1. Database backup
%MONGO_BIN%\mongodump --out="%BACKUP_DIR%"

:: 2. Compress backup folder into a zip file
powershell Compress-Archive -Path "%BACKUP_DIR%" -DestinationPath "%BACKUP_ZIP%"

:: 3. Upload the zip file to Google Drive
rclone copy "%BACKUP_ZIP%" gdrive:MongoBackups

:: 4. Delete the local backup folder and zip file
rmdir /S /Q "%BACKUP_DIR%"
del "%BACKUP_ZIP%"
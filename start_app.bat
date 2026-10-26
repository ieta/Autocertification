@echo off
chcp 65001 > nul
title Samyang Innochem Silo Monitoring WebApp
echo ========================================================
echo   삼양 이노켐 Silo 수입 실시간 모니터링 시스템 v2.0
echo   AVEVA PI Web API Direct Streaming
echo ========================================================
echo.
python run.py
pause

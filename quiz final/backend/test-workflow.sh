@echo off
REM ========================================
REM Quiz Manual Mode - Complete Workflow Test
REM ========================================
set BASE=http://localhost:3001/api
set TOKEN=

echo.
echo ===== STEP 1: Health Check =====
curl -s "%BASE%/health"
echo.

echo.
echo ===== STEP 2: Login =====
for /f "tokens=*" %%a in ('curl -s -X POST "%BASE%/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"') do set RESPONSE=%%a
echo %RESPONSE%
for /f "tokens=2 delims=:,}" %%a in ('echo %RESPONSE% ^| findstr token') do set TOKEN=%%a
set TOKEN=%TOINT:"=%
set TOKEN=%TOKEN: =%
echo Token: %TOKEN:~0,20%...
echo.

echo ===== STEP 3: Create Event =====
curl -s -X POST "%BASE%/events" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"name\":\"Quiz Finals 2026\",\"description\":\"Annual quiz competition\",\"date\":\"2026-06-15\"}"
echo.
set EID=1

echo ===== STEP 4: List Events =====
curl -s "%BASE%/events" -H "Authorization: Bearer %TOKEN%"
echo.

echo ===== STEP 5: Create Teams =====
curl -s -X POST "%BASE%/teams/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"team_name\":\"Team Alpha\"}"
echo.
curl -s -X POST "%BASE%/teams/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"team_name\":\"Team Beta\"}"
echo.
curl -s -X POST "%BASE%/teams/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"team_name\":\"Team Gamma\"}"
echo.
curl -s -X POST "%BASE%/teams/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"team_name\":\"Team Delta\"}"
echo.

echo ===== STEP 6: Create Easy Questions (5pts each) =====
curl -s -X POST "%BASE%/questions/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"question\":\"What is the capital of France?\",\"answer\":\"Paris\",\"difficulty\":\"Easy\"}"
echo.
curl -s -X POST "%BASE%/questions/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"question\":\"What is 2+2?\",\"answer\":\"4\",\"difficulty\":\"Easy\"}"
echo.
curl -s -X POST "%BASE%/questions/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"question\":\"What color is the sky?\",\"answer\":\"Blue\",\"difficulty\":\"Easy\"}"
echo.

echo ===== STEP 7: Create Medium Questions (10pts each) =====
curl -s -X POST "%BASE%/questions/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"question\":\"What is the square root of 144?\",\"answer\":\"12\",\"difficulty\":\"Medium\"}"
echo.
curl -s -X POST "%BASE%/questions/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"question\":\"Who wrote Romeo and Juliet?\",\"answer\":\"Shakespeare\",\"difficulty\":\"Medium\"}"
echo.

echo ===== STEP 8: Create Hard Question (15pts) =====
curl -s -X POST "%BASE%/questions/%EID%" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"question\":\"What is the speed of light in m/s?\",\"answer\":\"299792458\",\"difficulty\":\"Hard\"}"
echo.

echo ===== STEP 9: Get Question Board =====
curl -s "%BASE%/questions/%EID%/board" -H "Authorization: Bearer %TOKEN%"
echo.

echo ===== STEP 10: Start Quiz =====
curl -s -X POST "%BASE%/quiz/%EID%/start" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%"
echo.

echo ===== STEP 11: Get Quiz State =====
curl -s "%BASE%/quiz/%EID%/state" -H "Authorization: Bearer %TOKEN%"
echo.

echo ===== STEP 12: Answer Question #1 (correct) =====
curl -s -X POST "%BASE%/quiz/%EID%/answer" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"question_id\":1,\"team_id\":1,\"result\":\"correct\"}"
echo.

echo ===== STEP 13: Get Updated State =====
curl -s "%BASE%/quiz/%EID%/state" -H "Authorization: Bearer %TOKEN%"
echo.

echo ===== STEP 14: Answer Wrong (bounce to next team) =====
curl -s -X POST "%BASE%/quiz/%EID%/answer" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"question_id\":2,\"team_id\":1,\"result\":\"wrong\"}"
echo.

echo ===== STEP 15: Skip Next Turn =====
curl -s -X POST "%BASE%/quiz/%EID%/next-team" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%"
echo.

echo ===== STEP 16: Get Results =====
curl -s "%BASE%/quiz/%EID%/results" -H "Authorization: Bearer %TOKEN%"
echo.

echo.
echo ===== WORKFLOW COMPLETE =====
pause
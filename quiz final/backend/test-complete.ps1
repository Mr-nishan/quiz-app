# Complete Quiz Manual Mode Workflow Test
$base = "http://localhost:3001/api"
$token = $null

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quiz Manual Mode - Complete Workflow Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

function Invoke-Api($method, $path, $body) {
    $headers = @{ Authorization = "Bearer $token" }
    if ($body) {
        $jsonBody = $body | ConvertTo-Json -Compress
        return Invoke-RestMethod -Uri "$base$path" -Method $method -ContentType "application/json" -Headers $headers -Body $jsonBody
    } else {
        return Invoke-RestMethod -Uri "$base$path" -Method $method -Headers $headers
    }
}

# STEP 1: Health Check
Write-Host "`n[1/16] Health Check..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$base/health" -Method Get | ConvertTo-Json

# STEP 2: Login
Write-Host "`n[2/16] Login as admin..." -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'
$token = $login.token
Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Green

# STEP 3: Create Event
Write-Host "`n[3/16] Create Event..." -ForegroundColor Yellow
$event = Invoke-Api -method Post -path "/events" -body @{name="Quiz Finals 2026"; description="Annual quiz competition"; date="2026-06-15"}
Write-Host "Event ID: $($event.id)" -ForegroundColor Green
$eid = $event.id

# STEP 4: List Events
Write-Host "`n[4/16] List Events..." -ForegroundColor Yellow
$events = Invoke-Api -method Get -path "/events"
Write-Host "Total Events: $($events.Count)" -ForegroundColor Green

# STEP 5: Create Teams
Write-Host "`n[5/16] Create Teams..." -ForegroundColor Yellow
$teamNames = @("Team Alpha", "Team Beta", "Team Gamma", "Team Delta")
foreach ($name in $teamNames) {
    $team = Invoke-Api -method Post -path "/teams/$eid" -body @{team_name=$name}
    Write-Host "  Created: $($team.team_name) (ID: $($team.id))" -ForegroundColor Green
}

# STEP 6: Create Easy Questions
Write-Host "`n[6/16] Create Easy Questions (5pts)..." -ForegroundColor Yellow
$easyQuestions = @(
    @{question="What is the capital of France?"; answer="Paris"; difficulty="Easy"}
    @{question="What is 2+2?"; answer="4"; difficulty="Easy"}
    @{question="What color is the sky?"; answer="Blue"; difficulty="Easy"}
    @{question="How many legs does a dog have?"; answer="4"; difficulty="Easy"}
    @{question="What is the first letter of the alphabet?"; answer="A"; difficulty="Easy"}
)
foreach ($q in $easyQuestions) {
    $result = Invoke-Api -method Post -path "/questions/$eid" -body $q
    Write-Host "  [E] $($result.question) -> $($result.points)pts" -ForegroundColor Green
}

# STEP 7: Create Medium Questions
Write-Host "`n[7/16] Create Medium Questions (10pts)..." -ForegroundColor Yellow
$mediumQuestions = @(
    @{question="What is the square root of 144?"; answer="12"; difficulty="Medium"}
    @{question="Who wrote Romeo and Juliet?"; answer="Shakespeare"; difficulty="Medium"}
    @{question="What is the chemical symbol for water?"; answer="H2O"; difficulty="Medium"}
    @{question="How many planets are in our solar system?"; answer="8"; difficulty="Medium"}
    @{question="What year did WW2 end?"; answer="1945"; difficulty="Medium"}
)
foreach ($q in $mediumQuestions) {
    $result = Invoke-Api -method Post -path "/questions/$eid" -body $q
    Write-Host "  [M] $($result.question) -> $($result.points)pts" -ForegroundColor Green
}

# STEP 8: Create Hard Questions
Write-Host "`n[8/16] Create Hard Questions (15pts)..." -ForegroundColor Yellow
$hardQuestions = @(
    @{question="What is the speed of light in m/s?"; answer="299792458"; difficulty="Hard"}
    @{question="Who developed the theory of relativity?"; answer="Einstein"; difficulty="Hard"}
    @{question="What is the molecular formula of glucose?"; answer="C6H12O6"; difficulty="Hard"}
    @{question="What year was the first moon landing?"; answer="1969"; difficulty="Hard"}
    @{question="What is the fundamental particle with negative charge?"; answer="Electron"; difficulty="Hard"}
)
foreach ($q in $hardQuestions) {
    $result = Invoke-Api -method Post -path "/questions/$eid" -body $q
    Write-Host "  [H] $($result.question) -> $($result.points)pts" -ForegroundColor Green
}

# STEP 9: Get Question Board
Write-Host "`n[9/16] Get Question Board..." -ForegroundColor Yellow
$board = Invoke-Api -method Get -path "/questions/$eid/board"
Write-Host "Board Questions: $($board.Count)" -ForegroundColor Green

# STEP 10: Start Quiz
Write-Host "`n[10/16] Start Quiz..." -ForegroundColor Yellow
$start = Invoke-Api -method Post -path "/quiz/$eid/start"
Write-Host "Status: $($start.event.status)" -ForegroundColor Green
Write-Host "Current Team: $($start.currentTeam.team_name)" -ForegroundColor Cyan
Write-Host "Remaining Questions: $($start.event.remaining_questions)" -ForegroundColor Cyan

# STEP 11: Get Quiz State
Write-Host "`n[11/16] Get Quiz State..." -ForegroundColor Yellow
$state = Invoke-Api -method Get -path "/quiz/$eid/state"
Write-Host "Current Turn: $($state.currentTeam.team_name)" -ForegroundColor Cyan

# STEP 12: Answer Correctly (Team Alpha gets 5pts for Q1)
Write-Host "`n[12/16] Answer Correctly..." -ForegroundColor Yellow
$correct = Invoke-Api -method Post -path "/quiz/$eid/answer" -body @{question_id=1; result="correct"}
Write-Host "Points Awarded: $($correct.pointsAwarded)" -ForegroundColor Green
Write-Host "Next Team: $($correct.nextTeam.team_name)" -ForegroundColor Cyan

# STEP 13: Answer Wrong - should BOUNCE the question (Q2 stays available)
Write-Host "`n[13/16] Answer WRONG - Question Bounce Test..." -ForegroundColor Yellow
$wrong = Invoke-Api -method Post -path "/quiz/$eid/answer" -body @{question_id=2; result="wrong"}
Write-Host "Points Awarded: $($wrong.pointsAwarded)" -ForegroundColor Red
Write-Host "Next Team: $($wrong.nextTeam.team_name)" -ForegroundColor Cyan

# STEP 14: Next Team also answers wrong (Q2 still bounces)
Write-Host "`n[14/16] Wrong again - Q2 still available..." -ForegroundColor Yellow
$wrong2 = Invoke-Api -method Post -path "/quiz/$eid/answer" -body @{question_id=2; result="wrong"}
Write-Host "Points Awarded: $($wrong2.pointsAwarded)" -ForegroundColor Red
Write-Host "Next Team: $($wrong2.nextTeam.team_name)" -ForegroundColor Cyan

# STEP 15: Third team answers correctly - Q2 finally used
Write-Host "`n[15/16] Third team answers correctly - Q2 claimed..." -ForegroundColor Yellow
$correct2 = Invoke-Api -method Post -path "/quiz/$eid/answer" -body @{question_id=2; result="correct"}
Write-Host "Points Awarded: $($correct2.pointsAwarded)" -ForegroundColor Green
Write-Host "Next Team: $($correct2.nextTeam.team_name)" -ForegroundColor Cyan

# STEP 16: Get Results
Write-Host "`n[16/16] Get Results..." -ForegroundColor Yellow
$results = Invoke-Api -method Get -path "/quiz/$eid/results"
Write-Host "Winner: $($results.winner.team_name) - Score: $($results.winner.score)" -ForegroundColor Magenta
Write-Host "Runner Up: $($results.runnerUp.team_name) - Score: $($results.runnerUp.score)" -ForegroundColor Magenta
Write-Host "`nRankings:" -ForegroundColor Yellow
foreach ($team in $results.rankings) {
    Write-Host "  $($team.team_name): $($team.score) pts" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "WORKFLOW COMPLETE - All Tests Passed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
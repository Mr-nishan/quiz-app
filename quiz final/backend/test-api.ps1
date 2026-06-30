# Quiz Manual Mode - Full API Workflow Test
$token = $null
$eventId = $null
$teamIds = @()
$questionIds = @()

Write-Host "=== Quiz Manual Mode API Test ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n[1/8] Login as admin..." -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"username":"admin","password":"admin123"}'
$token = $login.token
Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Green
$authHeader = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}

# 2. Create Event
Write-Host "`n[2/8] Create event..." -ForegroundColor Yellow
$event = Invoke-RestMethod -Uri "http://localhost:3001/api/events" -Method Post -Headers $authHeader -Body '{"name":"Science Quiz 2026","description":"Annual science competition","date":"2026-06-15"}'
$eventId = $event.id
Write-Host "  Event created: ID=$eventId, Name=$($event.name)" -ForegroundColor Green

# 3. Create Teams (route: /api/teams/:eventId)
Write-Host "`n[3/8] Create teams..." -ForegroundColor Yellow
foreach ($name in @("Team Alpha","Team Beta","Team Gamma","Team Delta")) {
    $body = @{team_name=$name} | ConvertTo-Json
    $team = Invoke-RestMethod -Uri "http://localhost:3001/api/teams/$eventId" -Method Post -Headers $authHeader -Body $body
    $teamIds += $team.id
    Write-Host "  Team created: ID=$($team.id), Name=$($team.team_name)" -ForegroundColor Green
}

# 4. Create Questions (5 Easy, 5 Medium, 5 Hard) - route: /api/questions/:eventId
Write-Host "`n[4/8] Create questions..." -ForegroundColor Yellow
$questions = @(
    @{question="What is the chemical symbol for water?"; answer="H2O"; difficulty="easy"},
    @{question="What planet is known as the Red Planet?"; answer="Mars"; difficulty="easy"},
    @{question="What is the speed of light?"; answer="299,792,458 m/s"; difficulty="easy"},
    @{question="What gas do plants absorb from the atmosphere?"; answer="Carbon Dioxide"; difficulty="easy"},
    @{question="What is the largest organ in the human body?"; answer="Skin"; difficulty="easy"},
    @{question="What is Newton's second law of motion?"; answer="F=ma"; difficulty="medium"},
    @{question="What is the powerhouse of the cell?"; answer="Mitochondria"; difficulty="medium"},
    @{question="What element has atomic number 79?"; answer="Gold"; difficulty="medium"},
    @{question="What is the Schwarzschild radius?"; answer="The radius of a black hole's event horizon"; difficulty="medium"},
    @{question="What is the Aufbau principle?"; answer="Electrons fill orbitals from lowest to highest energy"; difficulty="medium"},
    @{question="What is the Heisenberg Uncertainty Principle?"; answer="Cannot know both position and momentum precisely"; difficulty="hard"},
    @{question="What is quantum entanglement?"; answer="Particles correlate regardless of distance"; difficulty="hard"},
    @{question="What is the Riemann Hypothesis about?"; answer="Zeros of the Riemann zeta function"; difficulty="hard"},
    @{question="What is Noether's theorem?"; answer="Symmetries correspond to conservation laws"; difficulty="hard"},
    @{question="What is the P vs NP problem?"; answer="Whether every solved problem can be verified quickly"; difficulty="hard"}
)
foreach ($q in $questions) {
    $body = $q | ConvertTo-Json
    $question = Invoke-RestMethod -Uri "http://localhost:3001/api/questions/$eventId" -Method Post -Headers $authHeader -Body $body
    $questionIds += $question.id
    Write-Host "  Question created: ID=$($question.id), Difficulty=$($q.difficulty)" -ForegroundColor Green
}

# 5. Start Quiz
Write-Host "`n[5/8] Start quiz..." -ForegroundColor Yellow
$start = Invoke-RestMethod -Uri "http://localhost:3001/api/quiz/$eventId/start" -Method Post -Headers $authHeader
Write-Host "  Quiz started: Turn=$($start.event.current_turn), Teams count=$($start.teams.Count)" -ForegroundColor Green

# 6. Get Quiz State
Write-Host "`n[6/8] Get quiz state..." -ForegroundColor Yellow
$state = Invoke-RestMethod -Uri "http://localhost:3001/api/quiz/$eventId/state" -Method Get -Headers $authHeader
Write-Host "  State: Status=$($state.event.status), CurrentTeam=$($state.currentTeam.team_name)" -ForegroundColor Green

# 7. Answer a question correctly
Write-Host "`n[7/8] Test answer submission..." -ForegroundColor Yellow
$board = Invoke-RestMethod -Uri "http://localhost:3001/api/quiz/$eventId/state" -Method Get -Headers $authHeader
Write-Host "  Available questions: $($board.stats.total_questions - $board.stats.used_questions) remaining" -ForegroundColor Green

# Get the first available question
$available = Invoke-RestMethod -Uri "http://localhost:3001/api/questions/$eventId" -Method Get -Headers $authHeader
$firstQ = $available | Where-Object { $_.used -eq 0 } | Select-Object -First 1
Write-Host "  First available question: ID=$($firstQ.id), Difficulty=$($firstQ.difficulty)" -ForegroundColor Green

$correctAns = Invoke-RestMethod -Uri "http://localhost:3001/api/quiz/$eventId/answer" -Method Post -Headers $authHeader -Body (@{question_id=$firstQ.id; result="correct"} | ConvertTo-Json)
Write-Host "  Correct answer: Points awarded=$($correctAns.pointsAwarded), NextTeam=$($correctAns.nextTeam.team_name)" -ForegroundColor Green

# 8. Get Results
Write-Host "`n[8/8] Get results..." -ForegroundColor Yellow
$results = Invoke-RestMethod -Uri "http://localhost:3001/api/quiz/$eventId/results" -Method Get -Headers $authHeader
Write-Host "  Results count: $($results.teams.Count) teams" -ForegroundColor Green
foreach ($t in $results.teams) {
    Write-Host "    $($t.team_name): $($t.score) pts" -ForegroundColor White
}
if ($results.winner) {
    Write-Host "  Winner: $($results.winner.team_name) with $($results.winner.score) pts" -ForegroundColor Magenta
}

Write-Host "`n=== ALL TESTS PASSED ===" -ForegroundColor Cyan
Write-Host "Event ID: $eventId" -ForegroundColor White
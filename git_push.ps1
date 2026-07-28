# This script configures the git author, stages all changed files,
# commits them with a professional Conventional Commit message, and pushes to origin.

# 1. Configure git author for this repository
git config user.name "bigyangg"
git config user.email "akagg07@proton.me"

# 2. Stage all changes
Write-Host "Staging files..." -ForegroundColor Cyan
git add -A

# 3. Check git status to confirm what's being committed
Write-Host "Current Git Status:" -ForegroundColor Yellow
git status

# 4. Commit message
$commitMessage = @"
feat(billing): integrate ConnectIPS gateway and implement admission billing workflow

- Introduce database schema migration for admission billing workflow (InvoiceType, GradeBillingMode, AdmissionStatus enums; fee/mode fields on Grade, Student, Course, Invoice; index on Invoice)
- Implement ConnectIPS API endpoints (/connectips/initiate, /connectips/return/success, /connectips/return/failure, /connectips/status)
- Implement server-to-server transaction validation and signature generation (SHA256withRSA) in connectips utility
- Support payment-driven student state transitions (ADMISSION payments unlock READY_FOR_LOGIN status)
- Add NepalPay QR generation endpoint and NepalPay webhook confirmation handler
- Support billing modes (GRADE vs SUBJECT/ACTIVITY) and recurring extra-activity invoicing
- Add comprehensive ConnectIPS Integration Guide documentation
"@

# 5. Commit changes
Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m $commitMessage

# 6. Push to remote origin
Write-Host "Pushing to origin..." -ForegroundColor Cyan
git push origin

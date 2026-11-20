# ReleaseLens

A local release-review workspace for a QA analyst. Compare two versions of a TypeScript pricing function, design a counterexample, save it as a regression case and make a release decision. The seeded scenario is an AI-authored portfolio simulation of a checkout change. Its functions run on your laptop. Each Run case request executes your entered values against the selected revision and baseline.

## Start on Windows

1. Extract the ZIP. Open the ReleaseLens folder containing server.ts and package.json. Type powershell in the File Explorer address bar and press Enter.
2. Check Node using the first command below. Use Node.js 24 or later. The app uses built-in Node modules and requires no npm install.
3. Run the second command and leave the window open.

~~~powershell
node --version
node server.ts
~~~

4. Open **http://127.0.0.1:4173** in Chrome. If another app is using that port, enter the following in the project directory and open the printed address.

~~~powershell
$env:PORT = '4174'
node server.ts
~~~

To stop the app, press Ctrl+C. Review data persists in this browser profile at the same address and port. Use a new browser profile for a fresh interview rehearsal. The demo is designed for a single reviewer in one active tab.

## Four-minute interview demo

| Step | Your action | What it demonstrates |
|---|---|---|
| 1 | Leave the revision on r1. Read CP-07 and expand the four passing checks. | The original function excludes equality. The proposed function fixes equality but counts delivery. None of the existing inputs cross the threshold through delivery alone. |
| 2 | Enter 950 merchandise, 60 delivery and predict ₹0. Click Run case. | The total is 1010, but eligible merchandise is only 950. Baseline gives ₹0 and r1 gives ₹100. The prediction comes from CP-07. |
| 3 | Save regression case. Enter a rationale, e.g. “Charging delivery wrongly qualifies a ₹950 basket for the coupon.” Click Request changes. | A reproducible finding blocks release. Try Approve revision with this failure to see the gate work. |
| 4 | Select r2 at the top. Replay saved cases. | The same inputs and expected output carry forward. The new calculation excludes delivery and gives ₹0. |
| 5 | Record your retest rationale and approve r2. Download the Markdown evidence. | The report contains both decision snapshots, timestamps, rationale and exact result rows. Refresh to check persistence. |

**Invite a live challenge.** Ask the interviewer to choose another basket. For example, predict the result for 999 merchandise and 1 delivery. Try 1000 merchandise and zero delivery as a control. Explain which input discriminates the two implementations and why. Reviewer-entered predictions are judgments: a mistaken expectation can itself cause a failing case. Remove a saved case to revise its prediction and record your reasoning. Past decision snapshots retain their original evidence.

## Run the tests yourself

In a second PowerShell window in the same folder:

~~~powershell
npm.cmd test
~~~

The six Node tests cover the old equality defect, both sets of green starter checks, a delivery-fee counterexample, a 35-combination matrix around the correction, and validation of monetary inputs and revision identifiers.

For the browser suite use Python 3.11+, Google Chrome and the following commands:

~~~powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest -v tests/test_ui.py
~~~

Pytest starts its own server on an available port. Selenium launches headless Chrome, enters data, records decisions, refreshes, replays saved cases and inspects the downloaded report. The first run can require internet access to obtain a matching ChromeDriver. If using an existing driver, set the CHROMEDRIVER environment variable to its absolute executable path. CHROME_BINARY is an optional path to a custom Chrome executable.

## Project map

| File | Responsibility |
|---|---|
| src/pricing.ts | Three executable revisions of one pricing rule. The displayed source comes from this file. |
| src/engine.ts | Four existing checks, monetary input validation and per-case execution with expected versus actual outputs. |
| server.ts | Serves the workspace and the local GET /api/release and POST /api/run endpoints. |
| web/ | Review interface, saved regression cases, decision snapshots and Markdown export. |
| tests/ | Node correctness checks and Pytest/Selenium browser workflows. |
| reports/ | Execution summaries and an example evidence file exported through the browser. |

## Scope of the result

The inputs are whole rupees in the range 0 to 1,000,000, with a predicted discount of 0 or 100. The demo uses local, predefined revisions and accepts new numeric cases. Persisted data belongs to the local browser profile. Changing browser, port or profile creates a separate workspace. The repo includes no customer data and requires no live model account. The supplied test reports were produced on Linux with headless Chromium. The commands above describe the Windows setup.

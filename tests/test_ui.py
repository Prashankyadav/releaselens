import os
from pathlib import Path
import subprocess

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.fixture(scope="session")
def url():
    root = Path(__file__).resolve().parents[1]
    with subprocess.Popen(["node", "server.ts"], cwd=root, env={**os.environ, "PORT": "0"},
                          stdout=subprocess.PIPE, text=True) as server:
        try:
            line = server.stdout.readline().strip()
            assert line.startswith("ReleaseLens http://127.0.0.1:"), line
            yield line.split()[1]
        finally:
            server.terminate()


@pytest.fixture
def browser(url, tmp_path):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,960")
    options.add_experimental_option("prefs", {"download.default_directory": str(tmp_path)})
    if os.environ.get("CHROME_BINARY"):
        options.binary_location = os.environ["CHROME_BINARY"]
    service = Service(executable_path=os.environ.get("CHROMEDRIVER"))
    with webdriver.Chrome(service=service, options=options) as driver:
        driver.execute_cdp_cmd("Browser.setDownloadBehavior", {"behavior": "allow", "downloadPath": str(tmp_path)})
        driver.implicitly_wait(3)
        driver.get(url)
        WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.ID, "suite")))
        WebDriverWait(driver, 10).until(lambda d: "4 / 4" in d.find_element(By.ID, "suite").text)
        yield driver


def field(driver, name):
    return driver.find_element(By.ID, name)


def challenge(d, subtotal="950", delivery="60", expected="0"):
    for key, val in [("subtotal", subtotal), ("delivery", delivery)]:
        field(d, key).clear()
        field(d, key).send_keys(val)
    Select(field(d, "expected")).select_by_value(expected)
    field(d, "run").click()
    WebDriverWait(d, 5).until(EC.visibility_of_element_located((By.ID, "outcome")))


def test_release_decision_lifecycle(browser, tmp_path):
    d = browser
    challenge(d)
    assert "Fail" in field(d, "outcome").text
    field(d, "save").click()
    field(d, "note").send_keys("Delivery triggered a discount on a 950-rupee basket.")
    field(d, "approve").click()
    assert "blocked" in field(d, "status").text
    field(d, "block").click()
    assert "Changes requested" in field(d, "decision").text
    d.refresh()
    WebDriverWait(d, 5).until(lambda w: "Changes requested" in field(w, "decision").text)
    Select(field(d, "revision")).select_by_value("corrected")
    field(d, "replay").click()
    assert "Observed ₹0 · Pass" in field(d, "saved").text
    field(d, "note").send_keys("Same basket passes with delivery excluded.")
    field(d, "approve").click()
    assert "Approved" in field(d, "decision").text
    assert "Changes requested" in field(d, "history").text
    field(d, "export").click()
    report = tmp_path / "PR-018-release-evidence.md"
    WebDriverWait(d, 8).until(lambda _: report.exists() and "Approved" in report.read_text(encoding="utf-8"))
    evidence = report.read_text(encoding="utf-8")
    assert "| 950 | 60 | 0 | 0 | 100 | Fail |" in evidence
    assert "| 950 | 60 | 0 | 0 | 0 | Pass |" in evidence


def test_input_edits_hide_stale_evidence(browser):
    challenge(browser)
    field(browser, "subtotal").send_keys("1")
    assert not field(browser, "result").is_displayed()


def test_duplicate_case_is_saved_once(browser):
    challenge(browser)
    field(browser, "save").click()
    field(browser, "save").click()
    assert field(browser, "count").text == "1 saved case"
    assert "already saved" in field(browser, "status").text


def test_decision_requires_rationale_and_evidence(browser):
    field(browser, "approve").click()
    assert "rationale" in field(browser, "status").text
    field(browser, "note").send_keys("Checked")
    field(browser, "approve").click()
    assert "Save a regression case" in field(browser, "status").text


def test_unseen_input_at_exact_threshold(browser):
    challenge(browser, "999", "1", "0")
    assert "Fail" in field(browser, "outcome").text
    assert "₹100" in field(browser, "metrics").text


def test_remove_case_preserves_recorded_evidence(browser):
    challenge(browser)
    field(browser, "save").click()
    field(browser, "note").send_keys("Unexpected discount")
    field(browser, "block").click()
    WebDriverWait(browser, 5).until(lambda d: "Changes requested" in field(d, "decision").text)
    browser.find_element(By.CSS_SELECTOR, "button.remove").click()
    assert "0 saved cases" in field(browser, "count").text
    assert "1 case(s)" in field(browser, "history").text

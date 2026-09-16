"""Comprehensive backend tests for OZOO SPACE OS."""
import os
import pytest
import requests
from urllib.parse import quote

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-task-engine-1.preview.emergentagent.com').rstrip('/')

CREDS = {
    "super_admin": ("pratyush@ozoo.me", "OzooAdmin#2026"),
    "business_admin": ("aarav@ozoo.me", "ozoo123"),
    "staff": ("rahul@ozoo.me", "ozoo123"),
    "client": ("client@abc.com", "ozoo123"),
}


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    d = r.json()
    return d["token"], d["user"]


@pytest.fixture(scope="module")
def tokens():
    return {role: _login(e, p) for role, (e, p) in CREDS.items()}


def _headers(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- AUTH ----------
class TestAuth:
    def test_all_roles_login(self, tokens):
        for role, (tok, user) in tokens.items():
            assert tok
            assert user["role"] == role or (role == "super_admin" and user["role"] == "super_admin")

    def test_me_endpoint(self, tokens):
        tok, u = tokens["super_admin"]
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == u["email"]

    def test_invalid_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "x@x.com", "password": "nope"}, timeout=10)
        assert r.status_code in (400, 401, 403)

    def test_no_token_forbidden(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code in (401, 403)


# ---------- DASHBOARD ----------
class TestDashboard:
    def test_super_admin_dashboard(self, tokens):
        tok, _ = tokens["super_admin"]
        r = requests.get(f"{BASE_URL}/api/dashboard", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        d = r.json()
        # KPI keys
        for k in ("active", "completed", "overdue", "blocked"):
            assert k in str(d).lower() or k in d or any(k in str(v).lower() for v in d.values())
        # deeper structure checks
        assert "workflow_distribution" in d or "workflow" in d or "distribution" in d
        assert "per_business" in d or "businesses" in d
        assert "recent_activity" in d or "activity" in d


# ---------- SCOPING ----------
class TestScoping:
    def test_super_admin_sees_all_projects(self, tokens):
        tok, _ = tokens["super_admin"]
        r = requests.get(f"{BASE_URL}/api/projects", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        projs = r.json()
        assert isinstance(projs, list) and len(projs) > 0
        biz_ids = {p.get("business_id") for p in projs}
        assert len(biz_ids) >= 2, f"expected multiple businesses, got {biz_ids}"

    def test_business_admin_scoped(self, tokens):
        tok, user = tokens["business_admin"]
        r = requests.get(f"{BASE_URL}/api/projects", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        projs = r.json()
        assert len(projs) > 0
        biz_ids = {p.get("business_id") for p in projs}
        assert biz_ids == {user["business_id"]}, f"biz_admin sees {biz_ids} expected only {user['business_id']}"

    def test_client_sees_only_visible_tasks(self, tokens):
        tok, user = tokens["client"]
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        tasks = r.json()
        assert isinstance(tasks, list) and len(tasks) > 0, "client should see >0 client_visible tasks"
        for t in tasks:
            assert t.get("client_visible") is True, f"non-visible task leaked to client: {t.get('id')}"
            # every task's client_id should match the client's client_id
            cid = user.get("client_id")
            if cid:
                assert t.get("client_id") == cid


# ---------- GROUP WORK ----------
class TestGroupWork:
    def test_group_work_multi_business(self, tokens):
        tok, _ = tokens["super_admin"]
        # try /api/group/work first, fallback to /api/tasks
        r = requests.get(f"{BASE_URL}/api/group/work", headers=_headers(tok), timeout=15)
        if r.status_code == 404:
            r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        rows = rows if isinstance(rows, list) else rows.get("items", [])
        assert len(rows) > 0
        # enriched fields
        sample = rows[0]
        for key in ("business_name", "project_name", "status", "priority"):
            assert key in sample, f"missing enriched key {key} in group work"
        biz_names = {r.get("business_name") for r in rows}
        assert len(biz_names) >= 2


# ---------- WORKFLOW GUARDRAILS ----------
class TestWorkflowGuardrails:
    def _find_task(self, tok, status):
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok),
                         params={"status": status}, timeout=15)
        assert r.status_code == 200
        tasks = r.json()
        tasks = tasks if isinstance(tasks, list) else tasks.get("items", [])
        tasks = [t for t in tasks if t.get("status") == status]
        assert tasks, f"no task with status {status}"
        return tasks[0]

    def test_available_actions_present(self, tokens):
        tok, _ = tokens["super_admin"]
        t = self._find_task(tok, "In Production")
        r = requests.get(f"{BASE_URL}/api/tasks/{t['id']}", headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "available_actions" in d
        assert isinstance(d["available_actions"], list)

    def test_illegal_jump_brief_to_published(self, tokens):
        tok, _ = tokens["business_admin"]
        t = self._find_task(tok, "Brief")
        r = requests.post(f"{BASE_URL}/api/tasks/{t['id']}/transition",
                          headers=_headers(tok),
                          json={"action": "publish"}, timeout=10)
        assert r.status_code in (400, 403, 422), f"illegal jump not blocked: {r.status_code} {r.text}"

    def test_illegal_production_to_published(self, tokens):
        tok, _ = tokens["staff"]
        t = self._find_task(tok, "In Production")
        r = requests.post(f"{BASE_URL}/api/tasks/{t['id']}/transition",
                          headers=_headers(tok),
                          json={"action": "publish"}, timeout=10)
        assert r.status_code in (400, 403, 422)

    def test_staff_cannot_pass_qa(self, tokens):
        tok, _ = tokens["staff"]
        # find Internal QA task
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok),
                         params={"status": "Internal QA"}, timeout=15)
        tasks = r.json()
        tasks = tasks if isinstance(tasks, list) else tasks.get("items", [])
        tasks = [t for t in tasks if t.get("status") == "Internal QA"]
        if not tasks:
            pytest.skip("no Internal QA task visible to staff")
        r = requests.post(f"{BASE_URL}/api/tasks/{tasks[0]['id']}/transition",
                          headers=_headers(tok),
                          json={"action": "pass_qa"}, timeout=10)
        assert r.status_code in (400, 403), f"staff pass_qa allowed! {r.status_code} {r.text}"


# ---------- WORKFLOW HAPPY PATH ----------
class TestWorkflowHappy:
    def test_admin_pass_qa(self, tokens):
        tok, _ = tokens["business_admin"]
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok),
                         params={"status": "Internal QA"}, timeout=15)
        tasks = [t for t in r.json() if t.get("status") == "Internal QA"]
        if not tasks:
            pytest.skip("no Internal QA task")
        tid = tasks[0]["id"]
        r = requests.post(f"{BASE_URL}/api/tasks/{tid}/transition",
                          headers=_headers(tok), json={"action": "pass_qa"}, timeout=10)
        assert r.status_code in (200, 201), f"pass_qa failed: {r.status_code} {r.text}"
        # verify
        r2 = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_headers(tok), timeout=10)
        assert r2.json()["status"] == "Ready for Delivery"

    def test_admin_request_rework(self, tokens):
        tok, _ = tokens["business_admin"]
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok),
                         params={"status": "Internal QA"}, timeout=15)
        tasks = [t for t in r.json() if t.get("status") == "Internal QA"]
        if not tasks:
            pytest.skip("no Internal QA task for rework")
        tid = tasks[0]["id"]
        r = requests.post(f"{BASE_URL}/api/tasks/{tid}/transition",
                          headers=_headers(tok),
                          json={"action": "request_rework", "reason": "needs polish"}, timeout=10)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        r2 = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_headers(tok), timeout=10)
        assert r2.json()["status"] == "Rework"


# ---------- BLOCKED FLOW ----------
class TestBlockedFlow:
    def test_block_and_resolve(self, tokens):
        tok, _ = tokens["business_admin"]
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok),
                         params={"status": "In Production"}, timeout=15)
        tasks = [t for t in r.json() if t.get("status") == "In Production"]
        if not tasks:
            pytest.skip("no In Production task")
        tid = tasks[0]["id"]
        r = requests.post(f"{BASE_URL}/api/tasks/{tid}/transition",
                          headers=_headers(tok),
                          json={"action": "mark_blocked", "reason": "waiting on assets"}, timeout=10)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        r2 = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_headers(tok), timeout=10)
        d = r2.json()
        assert d["status"] == "Blocked"
        prev = d.get("previous_status") or (d.get("block_info") or {}).get("previous_status")
        assert prev == "In Production"
        # illegal Blocked -> Published
        r3 = requests.post(f"{BASE_URL}/api/tasks/{tid}/transition",
                           headers=_headers(tok),
                           json={"action": "publish"}, timeout=10)
        assert r3.status_code in (400, 403, 422)
        # resolve
        r4 = requests.post(f"{BASE_URL}/api/tasks/{tid}/transition",
                           headers=_headers(tok),
                           json={"action": "resolve_block"}, timeout=10)
        assert r4.status_code in (200, 201), f"resolve_block failed {r4.status_code} {r4.text}"
        r5 = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_headers(tok), timeout=10)
        assert r5.json()["status"] == "In Production"


# ---------- OVERRIDE ----------
class TestOverride:
    def test_super_admin_override(self, tokens):
        tok, _ = tokens["super_admin"]
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok),
                         params={"status": "Brief"}, timeout=15)
        tasks = [t for t in r.json() if t.get("status") == "Brief"]
        if not tasks:
            pytest.skip("no Brief task")
        tid = tasks[0]["id"]
        r = requests.post(f"{BASE_URL}/api/tasks/{tid}/transition",
                          headers=_headers(tok),
                          json={"action": "override", "to_status": "Published",
                                "reason": "emergency publish"}, timeout=10)
        assert r.status_code in (200, 201), f"override failed {r.status_code} {r.text}"
        r2 = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_headers(tok), timeout=10)
        d = r2.json()
        assert d["status"] == "Published"
        assert d.get("override_history"), "override_history missing"

    def test_non_super_no_override(self, tokens):
        tok, _ = tokens["business_admin"]
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok),
                         params={"status": "Brief"}, timeout=15)
        tasks = [t for t in r.json() if t.get("status") == "Brief"]
        if not tasks:
            pytest.skip("no Brief task")
        tid = tasks[0]["id"]
        r2 = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_headers(tok), timeout=10)
        actions = r2.json().get("available_actions", [])
        keys = [a.get("action") or a.get("key") for a in actions]
        assert "override" not in keys


# ---------- CREATE TASK ----------
class TestCreateTask:
    def test_missing_fields_returns_400(self, tokens):
        tok, _ = tokens["business_admin"]
        r = requests.post(f"{BASE_URL}/api/tasks", headers=_headers(tok),
                          json={"title": "incomplete"}, timeout=10)
        assert r.status_code in (400, 422), f"{r.status_code} {r.text}"

    def test_full_create_ok(self, tokens):
        tok, user = tokens["business_admin"]
        # fetch bootstrap or refs
        r = requests.get(f"{BASE_URL}/api/bootstrap", headers=_headers(tok), timeout=15)
        boot = r.json() if r.status_code == 200 else {}
        # pick a project/service/owner from lists
        projects = boot.get("projects") or requests.get(f"{BASE_URL}/api/projects", headers=_headers(tok)).json()
        services = boot.get("services") or requests.get(f"{BASE_URL}/api/services", headers=_headers(tok)).json()
        users = boot.get("users") or requests.get(f"{BASE_URL}/api/users", headers=_headers(tok)).json()
        p = projects[0]
        s = services[0] if services else {"id": "svc1"}
        owner = next((u for u in users if u.get("role") == "staff"), users[0])
        payload = {
            "title": "TEST_created_by_pytest",
            "business_id": user["business_id"],
            "project_id": p["id"],
            "service_id": s["id"],
            "owner_id": owner["id"],
            "due_date": "2026-12-31",
            "brief": "test brief content"
        }
        r = requests.post(f"{BASE_URL}/api/tasks", headers=_headers(tok), json=payload, timeout=15)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        d = r.json()
        assert (d.get("code") or d.get("task_code") or "").startswith("TASK-")
        # verify created task is in Brief
        tid = d.get("id")
        assert tid
        r2 = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_headers(tok), timeout=10)
        assert r2.status_code == 200
        assert r2.json().get("status") == "Brief"


# ---------- CLIENT PORTAL ----------
class TestClientPortal:
    def test_client_cannot_transition(self, tokens):
        tok, user = tokens["client"]
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_headers(tok), timeout=15)
        tasks = r.json()
        if not tasks:
            pytest.skip("no visible tasks")
        tid = tasks[0]["id"]
        r = requests.post(f"{BASE_URL}/api/tasks/{tid}/transition",
                          headers=_headers(tok),
                          json={"action": "publish"}, timeout=10)
        assert r.status_code in (400, 401, 403)

    def test_client_get_own(self, tokens):
        tok, user = tokens["client"]
        cid = user.get("client_id")
        if not cid:
            pytest.skip("client has no client_id")
        r = requests.get(f"{BASE_URL}/api/clients/{cid}", headers=_headers(tok), timeout=10)
        assert r.status_code == 200


# ---------- REPORTS / WORKFLOW / AUDIT ----------
class TestReports:
    @pytest.mark.parametrize("path", ["/api/reports", "/api/workflow/overview", "/api/audit"])
    def test_endpoints_accessible(self, tokens, path):
        tok, _ = tokens["super_admin"]
        r = requests.get(f"{BASE_URL}{path}", headers=_headers(tok), timeout=15)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"

    def test_business_admin_scoped_reports(self, tokens):
        tok, user = tokens["business_admin"]
        r = requests.get(f"{BASE_URL}/api/reports", headers=_headers(tok), timeout=15)
        assert r.status_code == 200

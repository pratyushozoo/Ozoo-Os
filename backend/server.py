from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import uuid
from datetime import datetime, timezone, date

import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

from auth import (hash_password, verify_password, create_access_token,
                  decode_access_token)
from seed import seed, STATUSES, PRIORITIES

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="OZOO Space OS")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ozoo")

now = lambda: datetime.now(timezone.utc)
iso = lambda: now().isoformat()
nid = lambda: uuid.uuid4().hex

# ----------------------------------------------------------------------------
# Auth dependency
# ----------------------------------------------------------------------------


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


# ----------------------------------------------------------------------------
# Workflow engine
# ----------------------------------------------------------------------------

FLOW_NEXT = {
    "Brief": "In Production",
    "In Production": "Internal QA",
    "Internal QA": "Ready for Delivery",
    "Ready for Delivery": "Delivered",
    "Delivered": "Published",
}
ACTIVE_STATES = ["Brief", "In Production", "Internal QA", "Ready for Delivery", "Rework"]
QA_ROLES = ("business_admin", "super_admin")
WORK_ROLES = ("staff", "business_admin", "super_admin")


def missing_for_start(task):
    m = []
    if not task.get("owner_id"):
        m.append("Assign an owner")
    if not task.get("project_id"):
        m.append("Assign a project")
    if not (task.get("brief") or "").strip():
        m.append("Complete the brief")
    if not task.get("due_date"):
        m.append("Set a due date")
    return m


def missing_for_qa(task):
    m = []
    incomplete = [c for c in task.get("checklist", []) if c.get("mandatory") and not c.get("done")]
    if incomplete:
        m.append(f"Complete {len(incomplete)} mandatory checklist item(s)")
    incomplete_sub = [s for s in task.get("subtasks", []) if not s.get("done")]
    if incomplete_sub:
        m.append(f"Complete {len(incomplete_sub)} required subtask(s)")
    if not task.get("attachments"):
        m.append("Upload the required deliverable")
    return m


def available_actions(task, user):
    """Return the exact permitted next actions for this task + user."""
    role = user["role"]
    status = task["status"]
    actions = []

    if role == "client":
        if task.get("client_visible") and status in ("Ready for Delivery", "Delivered"):
            actions.append({"key": "client_approve", "label": "Approve Deliverable", "to": None, "variant": "success", "missing": []})
            actions.append({"key": "client_request_changes", "label": "Request Changes", "to": "Rework", "variant": "danger", "needs_reason": True, "missing": []})
        return actions

    if status == "Blocked":
        if role in WORK_ROLES:
            prev = (task.get("block_info") or {}).get("previous_status", "In Production")
            actions.append({"key": "resolve_block", "label": "Resolve Block", "to": prev, "variant": "primary", "missing": []})
    elif status == "Brief":
        if role in WORK_ROLES:
            actions.append({"key": "start_production", "label": "Start Production", "to": "In Production", "variant": "primary", "missing": missing_for_start(task)})
    elif status == "In Production":
        if role in WORK_ROLES:
            actions.append({"key": "submit_qa", "label": "Submit for QA", "to": "Internal QA", "variant": "primary", "missing": missing_for_qa(task)})
    elif status == "Internal QA":
        if role in QA_ROLES:
            actions.append({"key": "pass_qa", "label": "Pass QA", "to": "Ready for Delivery", "variant": "success", "missing": []})
            actions.append({"key": "request_rework", "label": "Request Rework", "to": "Rework", "variant": "danger", "needs_reason": True, "missing": []})
    elif status == "Rework":
        if role in WORK_ROLES:
            actions.append({"key": "resume_production", "label": "Resume Production", "to": "In Production", "variant": "primary", "missing": []})
    elif status == "Ready for Delivery":
        if role in QA_ROLES:
            actions.append({"key": "mark_delivered", "label": "Mark Delivered", "to": "Delivered", "variant": "primary", "needs_delivery": True, "missing": []})
    elif status == "Delivered":
        if role in QA_ROLES:
            actions.append({"key": "publish", "label": "Publish", "to": "Published", "variant": "primary", "needs_destination": True, "missing": []})

    if status in ACTIVE_STATES and role in WORK_ROLES:
        actions.append({"key": "mark_blocked", "label": "Mark Blocked", "to": "Blocked", "variant": "warning", "needs_reason": True, "missing": []})

    if role == "super_admin" and status != "Published":
        actions.append({"key": "override", "label": "Override Status", "to": "*", "variant": "ghost", "is_override": True, "missing": []})

    return actions


# ----------------------------------------------------------------------------
# Scoping
# ----------------------------------------------------------------------------


def scope_filter(user, business_id=None):
    role = user["role"]
    f = {}
    if role == "super_admin":
        if business_id and business_id != "all":
            f["business_id"] = business_id
    elif role == "business_admin":
        f["business_id"] = user.get("business_id")
    elif role == "staff":
        f["business_id"] = user.get("business_id")
    elif role == "client":
        f["client_id"] = user.get("client_id")
        f["client_visible"] = True
    return f


# ----------------------------------------------------------------------------
# Lookups + enrichment
# ----------------------------------------------------------------------------


async def get_lookups():
    async def m(coll, proj):
        rows = await db[coll].find({}, proj).to_list(2000)
        return {r["id"]: r for r in rows}
    businesses = await m("businesses", {"_id": 0})
    departments = await m("departments", {"_id": 0})
    teams = await m("teams", {"_id": 0})
    users = await m("users", {"_id": 0, "password_hash": 0})
    services = await m("services", {"_id": 0})
    clients = await m("clients", {"_id": 0})
    projects = await m("projects", {"_id": 0})
    return {"businesses": businesses, "departments": departments, "teams": teams,
            "users": users, "services": services, "clients": clients, "projects": projects}


def enrich_task(t, lk):
    b = lk["businesses"].get(t.get("business_id"), {})
    d = lk["departments"].get(t.get("department_id"), {})
    tm = lk["teams"].get(t.get("team_id"), {})
    u = lk["users"].get(t.get("owner_id"), {})
    c = lk["clients"].get(t.get("client_id"), {})
    s = lk["services"].get(t.get("service_id"), {})
    p = lk["projects"].get(t.get("project_id"), {})
    out = dict(t)
    out["business_name"] = b.get("name")
    out["business_code"] = b.get("code")
    out["department_name"] = d.get("name")
    out["division"] = t.get("division") or d.get("division")
    out["team_name"] = tm.get("name")
    out["owner_name"] = u.get("name")
    out["owner_avatar"] = u.get("avatar")
    out["client_name"] = c.get("name")
    out["service_name"] = s.get("name")
    out["project_name"] = p.get("name")
    out["project_code"] = p.get("code")
    out["participating_team_names"] = [lk["teams"].get(x, {}).get("name") for x in t.get("participating_team_ids", [])]
    return out


def is_overdue(t):
    if t["status"] in ("Delivered", "Published"):
        return False
    try:
        return date.fromisoformat(t["due_date"]) < now().date()
    except Exception:
        return False


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class TaskCreate(BaseModel):
    title: str
    business_id: str
    project_id: str
    service_id: Optional[str] = None
    client_id: Optional[str] = None
    owner_id: Optional[str] = None
    team_id: Optional[str] = None
    task_type: str = "Generic"
    priority: str = "Medium"
    due_date: Optional[str] = None
    brief: str = ""
    requirements: str = ""
    client_visible: bool = False
    checklist: List[str] = []


class TransitionBody(BaseModel):
    action: str
    reason: Optional[str] = None
    description: Optional[str] = None
    dependency: Optional[str] = None
    responsible: Optional[str] = None
    expected_resolution: Optional[str] = None
    destination: Optional[str] = None
    to_status: Optional[str] = None  # for override


class CommentBody(BaseModel):
    text: str
    client_visible: bool = False


# ----------------------------------------------------------------------------
# Auth routes
# ----------------------------------------------------------------------------


@api.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    user.pop("_id", None)
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"ok": True}


# ----------------------------------------------------------------------------
# Bootstrap (shell data)
# ----------------------------------------------------------------------------


@api.get("/bootstrap")
async def bootstrap(user: dict = Depends(get_current_user)):
    role = user["role"]
    if role == "super_admin":
        businesses = await db.businesses.find({}, {"_id": 0}).to_list(100)
    elif role == "client":
        client = await db.clients.find_one({"id": user.get("client_id")}, {"_id": 0})
        bids = client.get("business_ids", []) if client else []
        businesses = await db.businesses.find({"id": {"$in": bids}}, {"_id": 0}).to_list(100)
    else:
        businesses = await db.businesses.find({"id": user.get("business_id")}, {"_id": 0}).to_list(100)
    bids = [b["id"] for b in businesses]
    departments = await db.departments.find({"business_id": {"$in": bids}}, {"_id": 0}).to_list(500)
    teams = await db.teams.find({"business_id": {"$in": bids}}, {"_id": 0}).to_list(500)
    services = await db.services.find({}, {"_id": 0}).to_list(200)
    users = await db.users.find({"business_id": {"$in": bids}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    clients = await db.clients.find({"business_ids": {"$in": bids}}, {"_id": 0}).to_list(500)
    return {"user": user, "businesses": businesses, "departments": departments,
            "teams": teams, "services": services, "users": users, "clients": clients}


# ----------------------------------------------------------------------------
# Dashboard
# ----------------------------------------------------------------------------


def kpi_counts(tasks):
    def n(status):
        return sum(1 for t in tasks if t["status"] == status)
    active = sum(1 for t in tasks if t["status"] not in ("Delivered", "Published"))
    return {
        "total": len(tasks),
        "active": active,
        "brief": n("Brief"),
        "in_production": n("In Production"),
        "internal_qa": n("Internal QA"),
        "ready": n("Ready for Delivery"),
        "delivered": n("Delivered"),
        "published": n("Published"),
        "blocked": n("Blocked"),
        "rework": n("Rework"),
        "completed": n("Delivered") + n("Published"),
        "overdue": sum(1 for t in tasks if is_overdue(t)),
    }


@api.get("/dashboard")
async def dashboard(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    lk = await get_lookups()
    f = scope_filter(user, business_id)
    tasks = await db.tasks.find(f, {"_id": 0}).to_list(5000)
    proj_f = scope_filter(user, business_id)
    proj_f.pop("client_visible", None)
    projects = await db.projects.find({k: v for k, v in proj_f.items() if k != "client_visible"}, {"_id": 0}).to_list(2000)

    kpi = kpi_counts(tasks)

    # per-business breakdown (super admin only, all)
    per_business = []
    if user["role"] == "super_admin":
        for b in lk["businesses"].values():
            bt = [t for t in tasks if t["business_id"] == b["id"]]
            per_business.append({"id": b["id"], "name": b["name"], "code": b["code"],
                                 "accent": b.get("accent"),
                                 "active": sum(1 for t in bt if t["status"] not in ("Delivered", "Published")),
                                 "total": len(bt),
                                 "overdue": sum(1 for t in bt if is_overdue(t)),
                                 "blocked": sum(1 for t in bt if t["status"] == "Blocked")})

    # my work
    my = [t for t in tasks if t.get("owner_id") == user["id"]] if user["role"] in ("staff", "business_admin", "super_admin") else []
    today = now().date().isoformat()
    my_work = {
        "active": sum(1 for t in my if t["status"] in ACTIVE_STATES),
        "due_today": sum(1 for t in my if t.get("due_date") == today and t["status"] not in ("Delivered", "Published")),
        "overdue": sum(1 for t in my if is_overdue(t)),
        "blocked": sum(1 for t in my if t["status"] == "Blocked"),
        "in_qa": sum(1 for t in my if t["status"] == "Internal QA"),
    }

    needs_attention = {
        "overdue": kpi["overdue"],
        "blocked": kpi["blocked"],
        "rework": kpi["rework"],
        "unassigned": sum(1 for t in tasks if not t.get("owner_id")),
        "in_qa": kpi["internal_qa"],
    }

    active_clients = len({t["client_id"] for t in tasks if t.get("client_id")})
    at_risk_projects = sum(1 for p in projects if p.get("health") == "At Risk")

    acts = await db.activities.find(f if "business_id" in f else {}, {"_id": 0}).sort("created_at", -1).to_list(15)

    return {
        "kpi": kpi,
        "workflow": {s: sum(1 for t in tasks if t["status"] == s) for s in STATUSES},
        "per_business": per_business,
        "my_work": my_work,
        "needs_attention": needs_attention,
        "projects_active": sum(1 for p in projects if p.get("status") != "Completed"),
        "projects_total": len(projects),
        "at_risk_projects": at_risk_projects,
        "active_clients": active_clients,
        "businesses_count": len(lk["businesses"]),
        "recent_activity": acts,
    }


# ----------------------------------------------------------------------------
# Tasks
# ----------------------------------------------------------------------------


@api.get("/tasks")
async def list_tasks(business_id: Optional[str] = None, status: Optional[str] = None,
                     priority: Optional[str] = None, project_id: Optional[str] = None,
                     client_id: Optional[str] = None, service_id: Optional[str] = None,
                     team_id: Optional[str] = None, owner_id: Optional[str] = None,
                     mine: Optional[bool] = False, q: Optional[str] = None,
                     user: dict = Depends(get_current_user)):
    f = scope_filter(user, business_id)
    if status:
        f["status"] = status
    if priority:
        f["priority"] = priority
    if project_id:
        f["project_id"] = project_id
    if client_id:
        f["client_id"] = client_id
    if service_id:
        f["service_id"] = service_id
    if team_id:
        f["team_id"] = team_id
    if owner_id:
        f["owner_id"] = owner_id
    if mine:
        f["owner_id"] = user["id"]
    tasks = await db.tasks.find(f, {"_id": 0}).sort("created_at", -1).to_list(5000)
    lk = await get_lookups()
    out = [enrich_task(t, lk) for t in tasks]
    if q:
        ql = q.lower()
        out = [t for t in out if ql in (t.get("title", "") + t.get("code", "") + (t.get("client_name") or "") + (t.get("project_name") or "")).lower()]
    for t in out:
        t["overdue"] = is_overdue(t)
        t.pop("activity", None)
        t.pop("comments", None)
    return out


@api.get("/tasks/{task_id}")
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    f = scope_filter(user)
    for k, v in f.items():
        if k == "client_visible":
            if not t.get("client_visible"):
                raise HTTPException(status_code=403, detail="Not permitted")
        elif t.get(k) != v:
            raise HTTPException(status_code=403, detail="Not permitted")
    lk = await get_lookups()
    out = enrich_task(t, lk)
    out["overdue"] = is_overdue(t)
    out["available_actions"] = available_actions(t, user)
    # resolve names for infos
    if user["role"] == "client":
        out["comments"] = [c for c in out.get("comments", []) if c.get("client_visible")]
        out.pop("override_history", None)
        out.pop("qa_history", None)
    return out


@api.post("/tasks")
async def create_task(body: TaskCreate, user: dict = Depends(require_roles("business_admin", "super_admin", "staff"))):
    missing = []
    if not body.title.strip():
        missing.append("Task title")
    if not body.business_id:
        missing.append("Business")
    if not body.project_id:
        missing.append("Project")
    if not body.service_id:
        missing.append("Service")
    if not body.owner_id:
        missing.append("Owner")
    if not body.due_date:
        missing.append("Due date")
    if not body.brief.strip():
        missing.append("Brief")
    if missing:
        raise HTTPException(status_code=400, detail="Incomplete task. Missing: " + ", ".join(missing))

    if user["role"] != "super_admin" and body.business_id != user.get("business_id"):
        raise HTTPException(status_code=403, detail="Cannot create task in another business")

    project = await db.projects.find_one({"id": body.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    team = await db.teams.find_one({"id": body.team_id}, {"_id": 0}) if body.team_id else None
    dept_id = team["department_id"] if team else None

    last = await db.tasks.find({}, {"code": 1}).sort("code", -1).to_list(2000)
    max_num = 2400
    for row in last:
        try:
            max_num = max(max_num, int(row["code"].split("-")[1]))
        except Exception:
            pass
    code = f"TASK-{max_num + 1}"

    checklist = [{"id": nid(), "text": c, "mandatory": True, "done": False} for c in body.checklist]
    t = {
        "id": nid(), "code": code, "title": body.title.strip(), "brief": body.brief,
        "requirements": body.requirements, "task_type": body.task_type,
        "business_id": body.business_id, "division": None, "department_id": dept_id,
        "team_id": body.team_id, "participating_team_ids": [], "owner_id": body.owner_id,
        "client_id": body.client_id or project.get("client_id"),
        "service_id": body.service_id or project.get("service_id"),
        "project_id": body.project_id, "status": "Brief", "priority": body.priority,
        "due_date": body.due_date, "estimated_hours": 8, "client_visible": body.client_visible,
        "process": None, "checklist": checklist, "subtasks": [],
        "dependencies": {"blocked_by": [], "blocks": [], "depends_on": []},
        "attachments": [], "comments": [],
        "activity": [{"id": nid(), "actor_id": user["id"], "actor_name": user["name"],
                      "type": "created", "message": f"Task created by {user['name']}",
                      "created_at": iso(), "is_override": False}],
        "block_info": None, "rework_info": {"count": 0, "history": []}, "qa_history": [],
        "override_history": [], "delivery_info": None, "published_info": None,
        "created_at": iso(), "updated_at": iso(),
    }
    await db.tasks.insert_one(dict(t))
    await log_activity(t, user, "created", f"Task created by {user['name']}")
    t.pop("_id", None)
    return {"id": t["id"], "code": code}


async def log_activity(task, user, atype, message, is_override=False):
    await db.activities.insert_one({
        "id": nid(), "business_id": task["business_id"], "task_id": task["id"],
        "task_code": task["code"], "project_id": task.get("project_id"),
        "actor_id": user["id"], "actor_name": user["name"], "type": atype,
        "message": message, "created_at": iso(), "is_override": is_override,
    })


@api.post("/tasks/{task_id}/transition")
async def transition(task_id: str, body: TransitionBody, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    # scope check
    if user["role"] in ("business_admin", "staff") and t.get("business_id") != user.get("business_id"):
        raise HTTPException(status_code=403, detail="Not permitted")

    actions = {a["key"]: a for a in available_actions(t, user)}
    act = actions.get(body.action)
    if not act:
        raise HTTPException(status_code=403, detail="This action is not permitted for the current workflow stage.")
    if act.get("missing"):
        raise HTTPException(status_code=400, detail="Cannot proceed. " + "; ".join(act["missing"]))

    updates = {"updated_at": iso()}
    activity_msg = ""
    is_override = False
    key = body.action
    prev_status = t["status"]

    if key == "start_production":
        updates["status"] = "In Production"
        activity_msg = "Production started"
    elif key == "submit_qa":
        updates["status"] = "Internal QA"
        activity_msg = "Submitted for Internal QA"
    elif key == "pass_qa":
        updates["status"] = "Ready for Delivery"
        qa = t.get("qa_history", [])
        qa.append({"result": "Pass", "reviewer": user["name"], "feedback": "Approved", "at": iso()})
        updates["qa_history"] = qa
        activity_msg = "QA passed — Ready for Delivery"
    elif key == "request_rework":
        if not body.reason:
            raise HTTPException(status_code=400, detail="A rework reason is required.")
        updates["status"] = "Rework"
        ri = t.get("rework_info") or {"count": 0, "history": []}
        ri["count"] = ri.get("count", 0) + 1
        ri["feedback"] = body.reason
        ri["reviewer_name"] = user["name"]
        ri["history"] = (ri.get("history") or []) + [{"feedback": body.reason, "reviewer": user["name"], "at": iso()}]
        updates["rework_info"] = ri
        qa = t.get("qa_history", [])
        qa.append({"result": "Rework", "reviewer": user["name"], "feedback": body.reason, "at": iso()})
        updates["qa_history"] = qa
        activity_msg = f"QA failed — Rework requested: {body.reason}"
    elif key == "resume_production":
        updates["status"] = "In Production"
        activity_msg = "Rework completed — resumed Production"
    elif key == "mark_delivered":
        updates["status"] = "Delivered"
        updates["delivery_info"] = {"delivered_by": user["name"], "note": body.description or "Delivered", "at": iso()}
        activity_msg = "Marked Delivered"
    elif key == "publish":
        updates["status"] = "Published"
        updates["published_info"] = {"published_by": user["name"], "destination": body.destination or "Production", "at": iso()}
        activity_msg = f"Published to {body.destination or 'Production'}"
    elif key == "mark_blocked":
        if not body.reason:
            raise HTTPException(status_code=400, detail="A block reason is required.")
        updates["status"] = "Blocked"
        updates["block_info"] = {
            "reason": body.reason, "description": body.description or "",
            "dependency": body.dependency or "", "responsible": body.responsible or "",
            "expected_resolution": body.expected_resolution or "",
            "previous_status": prev_status, "blocked_at": iso(),
        }
        activity_msg = f"Blocked — {body.reason}"
    elif key == "resolve_block":
        bi = t.get("block_info") or {}
        updates["status"] = bi.get("previous_status", "In Production")
        updates["block_info"] = None
        activity_msg = f"Block resolved — returned to {updates['status']}"
    elif key == "override":
        if not body.to_status or body.to_status not in STATUSES:
            raise HTTPException(status_code=400, detail="A valid target status is required for override.")
        if not body.reason:
            raise HTTPException(status_code=400, detail="An override reason is required.")
        updates["status"] = body.to_status
        oh = t.get("override_history", [])
        oh.append({"from": prev_status, "to": body.to_status, "by": user["name"], "reason": body.reason, "at": iso()})
        updates["override_history"] = oh
        is_override = True
        activity_msg = f"Workflow Override: {prev_status} → {body.to_status} ({body.reason})"
    else:
        raise HTTPException(status_code=400, detail="Unknown action")

    activity = t.get("activity", [])
    activity.append({"id": nid(), "actor_id": user["id"], "actor_name": user["name"],
                     "type": key, "message": activity_msg, "created_at": iso(), "is_override": is_override})
    updates["activity"] = activity
    await db.tasks.update_one({"id": task_id}, {"$set": updates})
    await log_activity(t, user, key, activity_msg, is_override)
    return {"status": updates.get("status", prev_status), "message": activity_msg}


@api.post("/tasks/{task_id}/client-action")
async def client_action(task_id: str, body: TransitionBody, user: dict = Depends(require_roles("client"))):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t or t.get("client_id") != user.get("client_id") or not t.get("client_visible"):
        raise HTTPException(status_code=403, detail="Not permitted")
    activity = t.get("activity", [])
    if body.action == "client_approve":
        msg = f"Client approved the deliverable"
        activity.append({"id": nid(), "actor_id": user["id"], "actor_name": user["name"],
                         "type": "client_approve", "message": msg, "created_at": iso(), "is_override": False})
        await db.tasks.update_one({"id": task_id}, {"$set": {"activity": activity, "updated_at": iso()}})
    elif body.action == "client_request_changes":
        if not body.reason:
            raise HTTPException(status_code=400, detail="Please describe the changes requested.")
        ri = t.get("rework_info") or {"count": 0, "history": []}
        ri["count"] = ri.get("count", 0) + 1
        ri["feedback"] = body.reason
        ri["history"] = (ri.get("history") or []) + [{"feedback": body.reason, "reviewer": user["name"] + " (Client)", "at": iso()}]
        msg = f"Client requested changes: {body.reason}"
        activity.append({"id": nid(), "actor_id": user["id"], "actor_name": user["name"],
                         "type": "client_request_changes", "message": msg, "created_at": iso(), "is_override": False})
        await db.tasks.update_one({"id": task_id}, {"$set": {"status": "Rework", "rework_info": ri, "activity": activity, "updated_at": iso()}})
    else:
        raise HTTPException(status_code=400, detail="Unknown action")
    await log_activity(t, user, body.action, msg)
    return {"ok": True}


@api.post("/tasks/{task_id}/comments")
async def add_comment(task_id: str, body: CommentBody, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    cv = body.client_visible if user["role"] != "client" else True
    comment = {"id": nid(), "author_id": user["id"], "author_name": user["name"],
               "text": body.text, "client_visible": cv, "created_at": iso()}
    await db.tasks.update_one({"id": task_id}, {"$push": {"comments": comment}, "$set": {"updated_at": iso()}})
    await log_activity(t, user, "comment", "Added a comment")
    return comment


@api.post("/tasks/{task_id}/checklist/{item_id}/toggle")
async def toggle_checklist(task_id: str, item_id: str, user: dict = Depends(require_roles("staff", "business_admin", "super_admin"))):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    cl = t.get("checklist", [])
    for c in cl:
        if c["id"] == item_id:
            c["done"] = not c.get("done")
    await db.tasks.update_one({"id": task_id}, {"$set": {"checklist": cl, "updated_at": iso()}})
    return {"checklist": cl}


@api.post("/tasks/{task_id}/subtask/{sub_id}/toggle")
async def toggle_subtask(task_id: str, sub_id: str, user: dict = Depends(require_roles("staff", "business_admin", "super_admin"))):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    subs = t.get("subtasks", [])
    for s in subs:
        if s["id"] == sub_id:
            s["done"] = not s.get("done")
    await db.tasks.update_one({"id": task_id}, {"$set": {"subtasks": subs, "updated_at": iso()}})
    return {"subtasks": subs}


# ----------------------------------------------------------------------------
# Projects
# ----------------------------------------------------------------------------


@api.get("/projects")
async def list_projects(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    f = scope_filter(user, business_id)
    f.pop("client_visible", None)
    projects = await db.projects.find(f, {"_id": 0}).to_list(2000)
    lk = await get_lookups()
    all_tasks = await db.tasks.find({}, {"_id": 0, "project_id": 1, "status": 1, "due_date": 1}).to_list(10000)
    for p in projects:
        b = lk["businesses"].get(p["business_id"], {})
        c = lk["clients"].get(p["client_id"], {})
        s = lk["services"].get(p["service_id"], {})
        o = lk["users"].get(p["owner_id"], {})
        p["business_name"] = b.get("name"); p["business_code"] = b.get("code")
        p["client_name"] = c.get("name"); p["service_name"] = s.get("name")
        p["owner_name"] = o.get("name"); p["owner_avatar"] = o.get("avatar")
        pt = [t for t in all_tasks if t["project_id"] == p["id"]]
        p["active_tasks"] = sum(1 for t in pt if t["status"] not in ("Delivered", "Published"))
        p["total_tasks"] = len(pt)
    return projects


@api.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if user["role"] in ("business_admin", "staff") and p["business_id"] != user.get("business_id"):
        raise HTTPException(status_code=403, detail="Not permitted")
    lk = await get_lookups()
    b = lk["businesses"].get(p["business_id"], {})
    c = lk["clients"].get(p["client_id"], {})
    s = lk["services"].get(p["service_id"], {})
    o = lk["users"].get(p["owner_id"], {})
    p["business_name"] = b.get("name"); p["business_code"] = b.get("code")
    p["client_name"] = c.get("name"); p["service_name"] = s.get("name")
    p["owner_name"] = o.get("name"); p["owner_avatar"] = o.get("avatar")
    p["teams"] = [{"id": lk["teams"].get(tid, {}).get("id"), "name": lk["teams"].get(tid, {}).get("name")} for tid in p.get("team_ids", [])]
    tasks = await db.tasks.find({"project_id": project_id}, {"_id": 0}).to_list(2000)
    tasks = [enrich_task(t, lk) for t in tasks]
    for t in tasks:
        t["overdue"] = is_overdue(t)
        t.pop("activity", None); t.pop("comments", None)
    p["tasks"] = tasks
    p["workflow"] = {st: sum(1 for t in tasks if t["status"] == st) for st in STATUSES}
    # team members
    members = {}
    for t in tasks:
        oid = t.get("owner_id")
        if oid and oid in lk["users"]:
            members[oid] = lk["users"][oid]
    p["members"] = list(members.values())
    acts = await db.activities.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(40)
    p["activity"] = acts
    return p


# ----------------------------------------------------------------------------
# Clients
# ----------------------------------------------------------------------------


@api.get("/clients")
async def list_clients(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    lk = await get_lookups()
    if user["role"] == "super_admin":
        clients = await db.clients.find({}, {"_id": 0}).to_list(2000)
        if business_id and business_id != "all":
            clients = [c for c in clients if business_id in c.get("business_ids", [])]
    elif user["role"] == "client":
        clients = await db.clients.find({"id": user.get("client_id")}, {"_id": 0}).to_list(10)
    else:
        clients = await db.clients.find({"business_ids": user.get("business_id")}, {"_id": 0}).to_list(2000)
    all_tasks = await db.tasks.find({}, {"_id": 0, "client_id": 1, "status": 1, "due_date": 1}).to_list(10000)
    all_projects = await db.projects.find({}, {"_id": 0, "client_id": 1, "status": 1}).to_list(2000)
    for c in clients:
        c["business_names"] = [lk["businesses"].get(b, {}).get("name") for b in c.get("business_ids", [])]
        ct = [t for t in all_tasks if t["client_id"] == c["id"]]
        cp = [p for p in all_projects if p["client_id"] == c["id"]]
        c["active_projects"] = sum(1 for p in cp if p["status"] != "Completed")
        c["active_tasks"] = sum(1 for t in ct if t["status"] not in ("Delivered", "Published"))
        c["overdue_tasks"] = sum(1 for t in ct if is_overdue(t))
    return clients


@api.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    if user["role"] == "client" and user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Not permitted")
    lk = await get_lookups()
    c["business_names"] = [lk["businesses"].get(b, {}).get("name") for b in c.get("business_ids", [])]
    proj_f = {"client_id": client_id}
    if user["role"] in ("business_admin", "staff"):
        proj_f["business_id"] = user.get("business_id")
    projects = await db.projects.find(proj_f, {"_id": 0}).to_list(500)
    for p in projects:
        p["business_name"] = lk["businesses"].get(p["business_id"], {}).get("name")
        p["service_name"] = lk["services"].get(p["service_id"], {}).get("name")
    c["projects"] = projects
    task_f = {"client_id": client_id}
    if user["role"] == "client":
        task_f["client_visible"] = True
    elif user["role"] in ("business_admin", "staff"):
        task_f["business_id"] = user.get("business_id")
    tasks = await db.tasks.find(task_f, {"_id": 0}).to_list(2000)
    tasks = [enrich_task(t, lk) for t in tasks]
    for t in tasks:
        t["overdue"] = is_overdue(t)
        t.pop("activity", None); t.pop("comments", None)
    c["tasks"] = tasks
    return c


# ----------------------------------------------------------------------------
# Services / Teams / Users
# ----------------------------------------------------------------------------


@api.get("/services")
async def list_services(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    services = await db.services.find({}, {"_id": 0}).to_list(500)
    f = scope_filter(user, business_id)
    tasks = await db.tasks.find(f, {"_id": 0, "service_id": 1, "status": 1, "due_date": 1, "team_id": 1}).to_list(10000)
    projects = await db.projects.find({k: v for k, v in f.items() if k != "client_visible"}, {"_id": 0, "service_id": 1, "status": 1}).to_list(2000)
    for s in services:
        st = [t for t in tasks if t["service_id"] == s["id"]]
        sp = [p for p in projects if p["service_id"] == s["id"]]
        s["active_projects"] = sum(1 for p in sp if p["status"] != "Completed")
        s["active_tasks"] = sum(1 for t in st if t["status"] not in ("Delivered", "Published"))
        s["overdue_tasks"] = sum(1 for t in st if is_overdue(t))
        s["teams"] = len({t.get("team_id") for t in st if t.get("team_id")})
        completed = [t for t in st if t["status"] in ("Delivered", "Published")]
        s["delivered"] = len(completed)
    return services


@api.get("/teams")
async def list_teams(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    lk = await get_lookups()
    if user["role"] == "super_admin":
        teams = list(lk["teams"].values())
        if business_id and business_id != "all":
            teams = [t for t in teams if t["business_id"] == business_id]
    else:
        teams = [t for t in lk["teams"].values() if t["business_id"] == user.get("business_id")]
    all_tasks = await db.tasks.find({}, {"_id": 0}).to_list(10000)
    all_users = list(lk["users"].values())
    result = []
    for t in teams:
        members = [u for u in all_users if u.get("team_id") == t["id"]]
        tt = [x for x in all_tasks if x.get("team_id") == t["id"]]
        assigned = sum(1 for x in tt if x["status"] in ACTIVE_STATES)
        cap = t.get("capacity", 40)
        load = "Overloaded" if assigned > cap * 0.8 else ("Available" if assigned < cap * 0.4 else "Balanced")
        result.append({
            "id": t["id"], "name": t["name"], "business_id": t["business_id"],
            "business_name": lk["businesses"].get(t["business_id"], {}).get("name"),
            "department_name": lk["departments"].get(t["department_id"], {}).get("name"),
            "lead_name": lk["users"].get(t.get("lead_id"), {}).get("name"),
            "capacity": cap, "assigned": assigned, "load": load,
            "members": [{"id": m["id"], "name": m["name"], "title": m.get("title"), "avatar": m.get("avatar"),
                         "active": sum(1 for x in tt if x.get("owner_id") == m["id"] and x["status"] in ACTIVE_STATES)} for m in members],
            "member_count": len(members),
            "active_tasks": assigned,
            "overdue": sum(1 for x in tt if is_overdue(x)),
            "blocked": sum(1 for x in tt if x["status"] == "Blocked"),
            "projects": len({x.get("project_id") for x in tt}),
        })
    return result


@api.get("/users")
async def list_users(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] == "super_admin":
        f = {}
        if business_id and business_id != "all":
            f["business_id"] = business_id
    elif user["role"] == "business_admin":
        f = {"business_id": user.get("business_id")}
    else:
        f = {"business_id": user.get("business_id")}
    users = await db.users.find(f, {"_id": 0, "password_hash": 0}).to_list(2000)
    lk = await get_lookups()
    for u in users:
        u["business_name"] = lk["businesses"].get(u.get("business_id"), {}).get("name")
        u["team_name"] = lk["teams"].get(u.get("team_id"), {}).get("name")
    return users


# ----------------------------------------------------------------------------
# Group work / workflow / reports / activity / audit / notifications
# ----------------------------------------------------------------------------


@api.get("/group/work")
async def group_work(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    return await list_tasks(business_id=business_id, user=user)


@api.get("/workflow/overview")
async def workflow_overview(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    f = scope_filter(user, business_id)
    tasks = await db.tasks.find(f, {"_id": 0}).to_list(10000)
    lk = await get_lookups()
    overall = {s: sum(1 for t in tasks if t["status"] == s) for s in STATUSES}
    per_business = []
    if user["role"] == "super_admin":
        for b in lk["businesses"].values():
            bt = [t for t in tasks if t["business_id"] == b["id"]]
            per_business.append({"id": b["id"], "name": b["name"], "code": b["code"],
                                 "counts": {s: sum(1 for t in bt if t["status"] == s) for s in STATUSES}})
    return {"overall": overall, "per_business": per_business, "statuses": STATUSES}


@api.get("/reports")
async def reports(business_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    f = scope_filter(user, business_id)
    tasks = await db.tasks.find(f, {"_id": 0}).to_list(10000)
    lk = await get_lookups()

    by_business = {}
    by_owner = {}
    by_team = {}
    by_status = {s: 0 for s in STATUSES}
    qa_failures = 0
    rework_total = 0
    on_time = 0
    delivered = 0
    for t in tasks:
        bn = lk["businesses"].get(t["business_id"], {}).get("name", "—")
        by_business[bn] = by_business.get(bn, 0) + 1
        on = lk["users"].get(t.get("owner_id"), {}).get("name", "Unassigned")
        by_owner[on] = by_owner.get(on, 0) + 1
        tn = lk["teams"].get(t.get("team_id"), {}).get("name", "—")
        by_team[tn] = by_team.get(tn, 0) + 1
        by_status[t["status"]] += 1
        qa_failures += sum(1 for q in t.get("qa_history", []) if q.get("result") == "Rework")
        rework_total += (t.get("rework_info") or {}).get("count", 0)
        if t["status"] in ("Delivered", "Published"):
            delivered += 1
            if not is_overdue(t):
                on_time += 1

    return {
        "by_business": by_business,
        "by_owner": dict(sorted(by_owner.items(), key=lambda x: -x[1])[:12]),
        "by_team": by_team,
        "by_status": by_status,
        "overdue": sum(1 for t in tasks if is_overdue(t)),
        "blocked": by_status["Blocked"],
        "qa_failures": qa_failures,
        "rework_rate": round((rework_total / len(tasks) * 100) if tasks else 0, 1),
        "on_time_rate": round((on_time / delivered * 100) if delivered else 0, 1),
        "total": len(tasks),
        "delivered": delivered,
    }


@api.get("/activity")
async def activity(business_id: Optional[str] = None, limit: int = 40, user: dict = Depends(get_current_user)):
    f = {}
    if user["role"] == "super_admin":
        if business_id and business_id != "all":
            f["business_id"] = business_id
    elif user["role"] in ("business_admin", "staff"):
        f["business_id"] = user.get("business_id")
    else:
        raise HTTPException(status_code=403, detail="Not permitted")
    acts = await db.activities.find(f, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return acts


@api.get("/audit")
async def audit(business_id: Optional[str] = None, user: dict = Depends(require_roles("super_admin", "business_admin"))):
    f = {}
    if user["role"] == "super_admin":
        if business_id and business_id != "all":
            f["business_id"] = business_id
    else:
        f["business_id"] = user.get("business_id")
    acts = await db.activities.find(f, {"_id": 0}).sort("created_at", -1).to_list(300)
    lk = await get_lookups()
    for a in acts:
        a["business_name"] = lk["businesses"].get(a.get("business_id"), {}).get("name")
    return acts


@api.get("/notifications")
async def notifications(user: dict = Depends(get_current_user)):
    n = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return n


@api.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.get("/search")
async def search(q: str, user: dict = Depends(get_current_user)):
    ql = q.lower().strip()
    if not ql:
        return {"tasks": [], "projects": [], "clients": []}
    lk = await get_lookups()
    tf = scope_filter(user)
    tasks = await db.tasks.find(tf, {"_id": 0, "id": 1, "code": 1, "title": 1, "status": 1, "business_id": 1, "project_id": 1}).to_list(5000)
    tasks = [t for t in tasks if ql in (t["title"] + t["code"]).lower()][:8]
    for t in tasks:
        t["business_name"] = lk["businesses"].get(t["business_id"], {}).get("name")
    pf = {k: v for k, v in scope_filter(user).items() if k != "client_visible"}
    projects = await db.projects.find(pf, {"_id": 0, "id": 1, "code": 1, "name": 1, "business_id": 1}).to_list(2000)
    projects = [p for p in projects if ql in (p["name"] + p["code"]).lower()][:6]
    clients = []
    if user["role"] != "client":
        cf = {} if user["role"] == "super_admin" else {"business_ids": user.get("business_id")}
        crows = await db.clients.find(cf, {"_id": 0, "id": 1, "code": 1, "name": 1}).to_list(2000)
        clients = [c for c in crows if ql in (c["name"] + c["code"]).lower()][:6]
    return {"tasks": tasks, "projects": projects, "clients": clients}


@api.get("/")
async def root():
    return {"message": "OZOO Space OS API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.tasks.create_index("code")
    result = await seed(db)
    if result:
        logger.info(f"Seeded demo data: {result}")


@app.on_event("shutdown")
async def shutdown():
    client.close()

"""Idempotent demo-data seeding for OZOO Space OS."""
import os
import random
import uuid
from datetime import datetime, timezone, timedelta

from auth import hash_password

STATUSES = ["Brief", "In Production", "Internal QA", "Ready for Delivery",
            "Delivered", "Published", "Blocked", "Rework"]
PRIORITIES = ["Critical", "High", "Medium", "Low"]

now = lambda: datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat()


def nid():
    return uuid.uuid4().hex


def rel_date(days):
    return (now() + timedelta(days=days)).date().isoformat()


CHECKLIST_TEMPLATES = {
    "Design": ["Desktop design completed", "Mobile design completed",
               "Components documented", "Prototype linked", "Final assets uploaded"],
    "Development": ["Feature implemented", "Unit tests written", "Code reviewed",
                    "Responsive verified", "Deployed to staging"],
    "Content": ["Draft written", "Fact-checked", "SEO optimised",
                "Proofread", "Assets attached"],
    "SEO": ["Keyword research done", "On-page audit complete", "Meta tags written",
            "Backlink plan drafted"],
    "Consulting": ["Discovery complete", "Framework applied", "Draft report",
                   "Internal review", "Client-ready deck"],
    "Generic": ["Requirements confirmed", "Work completed", "Self-review done"],
}

TASK_TITLES = [
    "Homepage UI", "Mobile Layout", "Design System Tokens", "Landing Page Build",
    "Checkout Flow", "API Integration", "Keyword Research", "On-Page SEO Audit",
    "Blog Content Batch", "Brand Guidelines", "Logo Refresh", "Social Calendar",
    "Email Campaign", "Performance Report", "Document Review", "Market Analysis",
    "Financial Model", "Onboarding Deck", "UAE Setup Filing", "Compliance Checklist",
    "Video Storyboard", "Motion Graphics", "Product Photography", "Ad Creative Set",
    "Dashboard Widgets", "Auth Refactor", "Database Migration", "QA Regression Pass",
    "Client Handover Pack", "Case Study Writeup",
]

QA_FEEDBACK = [
    "Mobile layout requires correction.",
    "Spacing inconsistent with the design system.",
    "Copy needs a compliance review before publishing.",
    "Missing final export assets.",
    "Accessibility contrast fails on primary CTA.",
]
BLOCK_REASONS = [
    ("Waiting for client", "Awaiting approved brand assets from client."),
    ("Waiting for asset", "Pending final photography from the studio."),
    ("Approval pending", "Legal sign-off required before proceeding."),
    ("Technical issue", "Staging environment is down."),
    ("Dependency incomplete", "Blocked by an upstream design task."),
    ("Resource unavailable", "Assigned specialist is on leave."),
]


async def seed(db):
    existing = await db.businesses.count_documents({})
    if existing > 0:
        return

    rng = random.Random(42)
    admin_email = os.environ.get("ADMIN_EMAIL", "pratyush@ozoo.me")
    admin_pw = hash_password(os.environ.get("ADMIN_PASSWORD", "OzooAdmin#2026"))
    demo_pw = hash_password(os.environ.get("DEMO_PASSWORD", "ozoo123"))

    AVATARS = [
        "https://images.unsplash.com/photo-1609436132311-e4b0c9370469?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
    ]

    # ---- Businesses ----
    businesses = [
        {"id": nid(), "code": "OZ", "name": "Ozoo OS", "kind": "Product & Marketing", "accent": "indigo"},
        {"id": nid(), "code": "TH", "name": "Thrive", "kind": "Business Consultancy", "accent": "teal"},
        {"id": nid(), "code": "TC", "name": "Thats Creative", "kind": "Creative Studio", "accent": "pink"},
    ]
    bmap = {b["code"]: b for b in businesses}

    # ---- Departments ----
    dept_defs = {
        "OZ": [("Design", "Product"), ("Development", "Product"), ("Marketing", "Growth"), ("Operations", None)],
        "TH": [("Consulting", "Advisory"), ("Operations", None), ("Client Success", None)],
        "TC": [("Design", "Studio"), ("Content", "Studio"), ("Marketing", "Growth")],
    }
    departments = []
    for code, defs in dept_defs.items():
        for name, division in defs:
            departments.append({"id": nid(), "business_id": bmap[code]["id"],
                                "name": name, "division": division})

    def depts_of(bcode):
        return [d for d in departments if d["business_id"] == bmap[bcode]["id"]]

    def dept(bcode, name):
        return next(d for d in depts_of(bcode) if d["name"] == name)

    # ---- Teams ----
    team_defs = {
        "OZ": [("UI/UX", "Design"), ("Development", "Development"), ("SEO", "Marketing"), ("QA", "Development")],
        "TH": [("Consulting", "Consulting"), ("Client Success", "Client Success"), ("QA", "Operations")],
        "TC": [("Content", "Content"), ("Brand", "Design"), ("Social", "Marketing")],
    }
    teams = []
    for code, defs in team_defs.items():
        for name, dname in defs:
            teams.append({"id": nid(), "business_id": bmap[code]["id"],
                          "department_id": dept(code, dname)["id"], "name": name,
                          "lead_id": None, "capacity": rng.choice([30, 35, 40, 45])})

    def teams_of(bcode):
        return [t for t in teams if t["business_id"] == bmap[bcode]["id"]]

    # ---- Users ----
    users = []
    users.append({
        "id": nid(), "email": admin_email, "password_hash": admin_pw,
        "name": "Pratyush Ranjan", "role": "super_admin", "title": "Group CEO",
        "business_id": None, "department_id": None, "team_id": None,
        "avatar": AVATARS[0], "created_at": iso(now()),
    })

    admins = {
        "OZ": ("Aarav Mehta", "aarav@ozoo.me"),
        "TH": ("Sana Kapoor", "sana@thrive.me"),
        "TC": ("Dev Malhotra", "dev@thatscreative.me"),
    }
    admin_ids = {}
    for code, (name, email) in admins.items():
        uid = nid()
        admin_ids[code] = uid
        users.append({"id": uid, "email": email, "password_hash": demo_pw, "name": name,
                      "role": "business_admin", "title": "Business Admin",
                      "business_id": bmap[code]["id"], "department_id": None,
                      "team_id": None, "avatar": rng.choice(AVATARS), "created_at": iso(now())})

    staff_names = ["Rahul Sharma", "Neha Verma", "Amit Rao", "Priya Nair", "Arjun Iyer",
                   "Sara Khan", "Vikram Singh", "Ananya Das", "Karan Gupta", "Meera Joshi",
                   "Rohan Bose", "Divya Menon", "Sameer Ali", "Isha Reddy", "Aditya Kumar",
                   "Nisha Pillai", "Farah Sheikh", "Kabir Chopra", "Riya Sen", "Zoya Ahmed"]
    ni = 0
    for t in teams:
        bcode = next(c for c, b in bmap.items() if b["id"] == t["business_id"])
        count = rng.choice([2, 3])
        for _ in range(count):
            if ni >= len(staff_names):
                break
            name = staff_names[ni]; ni += 1
            uid = nid()
            email = name.split()[0].lower() + str(ni) + "@" + {"OZ": "ozoo.me", "TH": "thrive.me", "TC": "thatscreative.me"}[bcode]
            users.append({"id": uid, "email": email, "password_hash": demo_pw, "name": name,
                          "role": "staff", "title": rng.choice(["Specialist", "Senior Associate", "Associate", "Lead"]),
                          "business_id": t["business_id"], "department_id": t["department_id"],
                          "team_id": t["id"], "avatar": rng.choice(AVATARS), "created_at": iso(now())})
            if t["lead_id"] is None:
                t["lead_id"] = uid

    # give a friendly staff + admin demo login
    staff_demo = next(u for u in users if u["role"] == "staff" and u["business_id"] == bmap["OZ"]["id"])
    staff_demo["email"] = "rahul@ozoo.me"

    def business_users(bid):
        return [u for u in users if u.get("business_id") == bid and u["role"] == "staff"]

    # ---- Services ----
    service_defs = [
        ("UI/UX Design", "Design"), ("Web Development", "Development"), ("Branding", "Creative"),
        ("SEO", "Marketing"), ("Social Media", "Marketing"), ("Content", "Creative"),
        ("Marketing", "Growth"), ("Consultancy", "Advisory"),
    ]
    services = [{"id": nid(), "code": f"SVC-{i+1:03d}", "name": n, "category": c, "is_template": True}
                for i, (n, c) in enumerate(service_defs)]

    def svc(name):
        return next(s for s in services if s["name"] == name)

    # ---- Clients (group-level, some cross-business) ----
    client_names = ["Nova Retail", "BlueOrbit", "Zenith Health", "Kairos Foods", "Lumen Bank",
                    "Aster Labs", "Peak Ventures", "Verde Living", "Orbit Media", "Cove Hotels",
                    "Nimbus SaaS", "Terra Realty", "Halo Cosmetics", "Vega Motors", "Ivory Interiors",
                    "Quanta Edu", "Solace Wellness", "Meridian Legal", "Pulse Fitness", "Bloom Florals",
                    "Crest Logistics", "Onyx Studios"]
    clients = []
    for i, name in enumerate(client_names):
        rels = [businesses[0]["id"]]
        r = rng.random()
        if r > 0.7:
            rels = [businesses[0]["id"], businesses[1]["id"]]
        elif r > 0.45:
            rels = [rng.choice(businesses)["id"]]
        elif r > 0.2:
            rels = [businesses[1]["id"], businesses[2]["id"]]
        rels = list(dict.fromkeys(rels))
        clients.append({
            "id": nid(), "code": f"CLT-{i+1:03d}", "name": name,
            "business_ids": rels,
            "contact_name": rng.choice(["Alex Morgan", "Jamie Lee", "Chris Patel", "Robin Shah", "Taylor Wu"]),
            "contact_email": "contact@" + name.split()[0].lower() + ".com",
            "industry": rng.choice(["Retail", "Healthcare", "Finance", "Technology", "Hospitality", "Legal", "Education"]),
            "since": rel_date(-rng.randint(120, 900)),
        })

    def clients_of(bid):
        return [c for c in clients if bid in c["business_ids"]]

    # ---- Client login users ----
    cross_client = next(c for c in clients if len(c["business_ids"]) >= 2)
    cross_client["name"] = "Client ABC"
    cross_client["business_ids"] = [businesses[0]["id"], businesses[1]["id"]]
    users.append({"id": nid(), "email": "client@abc.com", "password_hash": demo_pw,
                  "name": "Jordan Blake", "role": "client", "title": "Client Contact",
                  "business_id": None, "department_id": None, "team_id": None,
                  "client_id": cross_client["id"], "avatar": rng.choice(AVATARS), "created_at": iso(now())})

    # ---- Projects ----
    project_titles = ["Website Revamp", "SEO Growth", "Brand Identity", "Mobile App", "Social Launch",
                      "UAE Business Setup", "Market Entry Study", "Content Engine", "E-commerce Build",
                      "Product Video", "Ad Campaign Q3", "Compliance Program", "Analytics Dashboard",
                      "Rebrand 2026", "Customer Portal", "Lead Gen Funnel", "Landing Page Suite",
                      "Investor Deck", "Photography Set", "Newsletter Program", "Design System",
                      "Payment Integration"]
    proj_status_pool = ["On Track", "On Track", "At Risk", "On Track", "Completed"]
    projects = []
    pi = 0
    for b in businesses:
        bclients = clients_of(b["id"])
        bteams = teams_of(next(c for c, bb in bmap.items() if bb["id"] == b["id"]))
        bstaff = business_users(b["id"]) or [u for u in users if u["business_id"] == b["id"]]
        n_proj = 8 if b["code"] == "OZ" else 7
        for j in range(n_proj):
            title = project_titles[pi % len(project_titles)]; pi += 1
            # Force the demo cross-business client onto the first project of Ozoo OS & Thrive
            if j == 0 and b["id"] in cross_client["business_ids"]:
                client = cross_client
            else:
                client = rng.choice(bclients)
            owner = rng.choice(bstaff) if bstaff else users[0]
            part_teams = rng.sample(bteams, k=min(len(bteams), rng.choice([1, 2, 3])))
            status = rng.choice(proj_status_pool)
            projects.append({
                "id": nid(), "code": f"PRJ-{len(projects)+101}", "name": title,
                "business_id": b["id"], "client_id": client["id"],
                "service_id": rng.choice(services)["id"],
                "owner_id": owner["id"], "team_ids": [t["id"] for t in part_teams],
                "status": status, "progress": 100 if status == "Completed" else rng.randint(10, 90),
                "due_date": rel_date(rng.randint(-10, 60)),
                "health": "At Risk" if status == "At Risk" else ("Complete" if status == "Completed" else "Healthy"),
                "created_at": iso(now() - timedelta(days=rng.randint(20, 180))),
                "description": f"{title} engagement for {client['name']} delivered by {b['name']}.",
            })

    # ---- Tasks ----
    status_weights = [
        ("Brief", 12), ("In Production", 26), ("Internal QA", 12),
        ("Ready for Delivery", 8), ("Delivered", 10), ("Published", 14),
        ("Blocked", 8), ("Rework", 6),
    ]
    weighted_statuses = []
    for s, w in status_weights:
        weighted_statuses += [s] * w

    tasks = []
    activities = []
    task_counter = 2400

    for p in projects:
        b = next(bb for bb in businesses if bb["id"] == p["business_id"])
        bcode = b["code"]
        bteams = teams_of(bcode)
        bstaff = business_users(p["business_id"]) or [u for u in users if u["business_id"] == p["business_id"]]
        n_tasks = rng.randint(4, 8)
        project_task_codes = []
        for ti in range(n_tasks):
            task_counter += 1
            code = f"TASK-{task_counter}"
            team = rng.choice(bteams)
            owner = rng.choice([u for u in bstaff if u.get("team_id") == team["id"]] or bstaff)
            status = rng.choice(weighted_statuses)
            if p["status"] == "Completed":
                status = rng.choice(["Delivered", "Published", "Published"])
            title = rng.choice(TASK_TITLES)
            ttype = team["name"] if team["name"] in CHECKLIST_TEMPLATES else "Generic"
            ck_items = CHECKLIST_TEMPLATES.get(team["name"], CHECKLIST_TEMPLATES["Generic"])
            done_upto = len(ck_items)
            if status in ("Brief",):
                done_upto = 0
            elif status == "In Production":
                done_upto = rng.randint(0, len(ck_items) - 1)
            checklist = [{"id": nid(), "text": t, "mandatory": idx < max(2, len(ck_items) - 1),
                          "done": idx < done_upto} for idx, t in enumerate(ck_items)]

            overdue = status not in ("Delivered", "Published") and rng.random() < 0.28
            due = rel_date(-rng.randint(1, 12)) if overdue else rel_date(rng.randint(0, 30))

            created = now() - timedelta(days=rng.randint(3, 40))
            is_cross = p["client_id"] == cross_client["id"]
            client_visible = True if (is_cross and rng.random() < 0.8) else (rng.random() < 0.4)

            acts = [{"id": nid(), "actor_id": owner["id"], "actor_name": owner["name"],
                     "type": "created", "message": f"Task created in {p['name']}",
                     "created_at": iso(created), "is_override": False}]

            block_info = None
            rework_info = {"count": 0, "history": []}
            qa_history = []
            override_history = []
            prev = "In Production"

            if status == "Blocked":
                reason, desc = rng.choice(BLOCK_REASONS)
                prev = rng.choice(["In Production", "Internal QA", "Ready for Delivery"])
                block_info = {"reason": reason, "description": desc,
                              "dependency": rng.choice(["TASK-2402", "External vendor", "None"]),
                              "responsible": rng.choice(["Client", "Design Team", "Vendor"]),
                              "expected_resolution": rel_date(rng.randint(1, 7)),
                              "previous_status": prev,
                              "blocked_at": iso(now() - timedelta(hours=rng.randint(2, 60)))}
                acts.append({"id": nid(), "actor_id": owner["id"], "actor_name": owner["name"],
                             "type": "blocked", "message": f"Blocked — {reason}",
                             "created_at": block_info["blocked_at"], "is_override": False})
            if status == "Rework":
                rc = rng.randint(1, 2)
                fb = rng.choice(QA_FEEDBACK)
                reviewer = admin_ids.get(bcode)
                rname = next((u["name"] for u in users if u["id"] == reviewer), "QA Reviewer")
                rework_info = {"count": rc, "feedback": fb, "reviewer_id": reviewer,
                               "reviewer_name": rname,
                               "history": [{"feedback": fb, "reviewer": rname,
                                            "at": iso(now() - timedelta(hours=rng.randint(4, 40)))}]}
                qa_history.append({"result": "Rework", "reviewer": rname, "feedback": fb,
                                   "at": iso(now() - timedelta(hours=rng.randint(4, 40)))})
                acts.append({"id": nid(), "actor_id": reviewer, "actor_name": rname,
                             "type": "rework", "message": f"QA failed — {fb}",
                             "created_at": iso(now() - timedelta(hours=rng.randint(4, 40))), "is_override": False})
            if status in ("Ready for Delivery", "Delivered", "Published"):
                reviewer = admin_ids.get(bcode)
                rname = next((u["name"] for u in users if u["id"] == reviewer), "QA Reviewer")
                qa_history.append({"result": "Pass", "reviewer": rname, "feedback": "Approved",
                                   "at": iso(now() - timedelta(days=rng.randint(1, 8)))})

            delivery_info = None
            published_info = None
            if status in ("Delivered", "Published"):
                delivery_info = {"delivered_by": admin_ids.get(bcode), "note": "Final deliverable shared with client",
                                 "at": iso(now() - timedelta(days=rng.randint(1, 6)))}
            if status == "Published":
                published_info = {"published_by": admin_ids.get(bcode),
                                  "destination": rng.choice(["Production", "Client Site", "App Store", "LinkedIn"]),
                                  "at": iso(now() - timedelta(days=rng.randint(0, 4)))}
                if rng.random() < 0.15:
                    override_history.append({"from": "Internal QA", "to": "Delivered",
                                             "by": "Pratyush Ranjan", "reason": "Emergency client release",
                                             "at": iso(now() - timedelta(days=rng.randint(1, 4)))})
                    acts.append({"id": nid(), "actor_id": users[0]["id"], "actor_name": "Pratyush Ranjan",
                                 "type": "override", "message": "Workflow Override: Internal QA → Delivered (Emergency client release)",
                                 "created_at": iso(now() - timedelta(days=rng.randint(1, 4))), "is_override": True})

            subtasks = []
            if rng.random() < 0.4:
                subtasks = [{"id": nid(), "title": st, "done": rng.random() < 0.5}
                            for st in rng.sample(["Homepage Design", "Mobile Design", "Development",
                                                  "QA", "Content Upload", "Review"], k=rng.randint(2, 4))]

            comments = []
            if rng.random() < 0.6:
                commenter = rng.choice(bstaff)
                comments.append({"id": nid(), "author_id": commenter["id"], "author_name": commenter["name"],
                                 "text": rng.choice(["Started on this, will update by EOD.",
                                                     "Please confirm the brief scope.",
                                                     "Assets uploaded, ready for review.",
                                                     "Blocked on client feedback."]),
                                 "client_visible": False,
                                 "created_at": iso(now() - timedelta(hours=rng.randint(1, 48)))})

            attachments = []
            if status in ("Internal QA", "Ready for Delivery", "Delivered", "Published"):
                attachments = [{"id": nid(), "name": rng.choice(["deliverable-v2.pdf", "final-assets.zip", "design.fig", "report.docx"]),
                                "size": f"{rng.randint(120, 4200)} KB",
                                "uploaded_by": owner["name"], "url": "#"}]

            task = {
                "id": nid(), "code": code, "title": f"{title}",
                "brief": f"Deliver {title.lower()} for {p['name']} in line with the {ttype} standards and OZOO workflow.",
                "requirements": "Follow the linked SOP. Complete all mandatory checklist items before submitting for QA.",
                "task_type": ttype,
                "business_id": p["business_id"], "division": next((d["division"] for d in departments if d["id"] == team["department_id"]), None),
                "department_id": team["department_id"], "team_id": team["id"],
                "participating_team_ids": rng.sample([t["id"] for t in bteams], k=min(len(bteams), rng.choice([0, 1, 2]))),
                "owner_id": owner["id"], "client_id": p["client_id"], "service_id": p["service_id"],
                "project_id": p["id"], "status": status, "priority": rng.choice(PRIORITIES),
                "due_date": due, "estimated_hours": rng.choice([4, 8, 12, 16, 24, 40]),
                "client_visible": client_visible,
                "process": rng.choice(["Social Media Publishing SOP", "Design Delivery SOP",
                                       "QA Review SOP", "Client Onboarding SOP", None]),
                "checklist": checklist, "subtasks": subtasks,
                "dependencies": {"blocked_by": [], "blocks": [], "depends_on": []},
                "attachments": attachments, "comments": comments, "activity": acts,
                "block_info": block_info, "rework_info": rework_info, "qa_history": qa_history,
                "override_history": override_history, "delivery_info": delivery_info,
                "published_info": published_info,
                "created_at": iso(created), "updated_at": iso(now()),
            }
            tasks.append(task)
            project_task_codes.append(code)

            for a in acts:
                activities.append({"id": nid(), "business_id": task["business_id"], "task_id": task["id"],
                                   "task_code": code, "project_id": p["id"],
                                   "actor_id": a["actor_id"], "actor_name": a["actor_name"],
                                   "type": a["type"], "message": a["message"],
                                   "created_at": a["created_at"], "is_override": a.get("is_override", False)})

        # dependencies within project
        if len(project_task_codes) >= 2:
            for i in range(1, len(project_task_codes)):
                if rng.random() < 0.35:
                    dep = project_task_codes[i - 1]
                    t = next(tt for tt in tasks if tt["code"] == project_task_codes[i])
                    t["dependencies"]["blocked_by"].append(dep)
                    src = next(tt for tt in tasks if tt["code"] == dep)
                    src["dependencies"]["blocks"].append(project_task_codes[i])

    # ---- Notifications ----
    notifications = []
    for u in users:
        if u["role"] in ("staff", "business_admin"):
            for _ in range(rng.randint(1, 3)):
                notifications.append({
                    "id": nid(), "user_id": u["id"],
                    "type": rng.choice(["assigned", "qa_feedback", "blocked", "approaching", "approved"]),
                    "message": rng.choice(["A task was assigned to you.", "QA feedback added on a task.",
                                           "A task you own is blocked.", "A deadline is approaching.",
                                           "Your task was approved."]),
                    "read": rng.random() < 0.5,
                    "created_at": iso(now() - timedelta(hours=rng.randint(1, 72))),
                })

    await db.businesses.insert_many(businesses)
    await db.departments.insert_many(departments)
    await db.teams.insert_many(teams)
    await db.users.insert_many([dict(u) for u in users])
    await db.services.insert_many(services)
    await db.clients.insert_many(clients)
    await db.projects.insert_many(projects)
    await db.tasks.insert_many(tasks)
    await db.activities.insert_many(activities)
    if notifications:
        await db.notifications.insert_many(notifications)

    return {"users": len(users), "tasks": len(tasks), "projects": len(projects),
            "clients": len(clients), "businesses": len(businesses)}

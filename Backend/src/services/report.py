import csv
import io
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from models.publication import Publication, PublicationAuthor
from models.researcher import Researcher
from models.department import Department
from models.institution import Institution
from models.collaboration import Collaboration
from models.project import Project, ProjectMember
from models.conference import Conference, ConferenceParticipation
from models.report import SavedReport
from models.user import User
from schemas.report import SavedReportCreate


def _get_role(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


# ─────────────────────────────────────────────────────
# PUBLICATIONS REPORT  (role-filtered)
# ─────────────────────────────────────────────────────
def get_publication_report(db: Session, current_user: User = None):
    role = _get_role(current_user) if current_user else "SystemAdmin"

    if role == "Researcher":
        researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        pub_ids = []
        if researcher:
            pa_rows = db.query(PublicationAuthor.publication_id).filter(
                PublicationAuthor.researcher_id == researcher.id
            ).all()
            pub_ids = [r[0] for r in pa_rows]
        # own uploads + co-authored
        own_filter = [Publication.uploaded_by == current_user.id]
        if pub_ids:
            own_filter.append(Publication.id.in_(pub_ids))
        pubs = db.query(Publication).filter(or_(*own_filter)).all()
        total = len(pubs)
        type_counts: dict = {}
        status_counts: dict = {}
        for p in pubs:
            t = p.type or "Unknown"
            s = p.status or "Unknown"
            type_counts[t] = type_counts.get(t, 0) + 1
            status_counts[s] = status_counts.get(s, 0) + 1

    elif role == "InstitutionAdmin":
        researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        inst_id = researcher.institution_id if researcher else None
        if not inst_id:
            first_inst = db.query(Institution).first()
            inst_id = first_inst.id if first_inst else None

        if not inst_id:
            return {"total_publications": 0, "type_counts": {}, "status_counts": {}}

        res_ids = [r[0] for r in db.query(Researcher.id).filter(Researcher.institution_id == inst_id).all()]
        if res_ids:
            pub_ids = [r[0] for r in db.query(PublicationAuthor.publication_id).filter(
                PublicationAuthor.researcher_id.in_(res_ids)
            ).distinct().all()]
        else:
            pub_ids = []

        pubs = db.query(Publication).filter(Publication.id.in_(pub_ids)).all() if pub_ids else []
        total = len(pubs)
        type_counts = {}
        status_counts = {}
        for p in pubs:
            t = p.type or "Unknown"
            s = p.status or "Unknown"
            type_counts[t] = type_counts.get(t, 0) + 1
            status_counts[s] = status_counts.get(s, 0) + 1

    else:
        # SystemAdmin — global
        total = db.query(Publication).count()
        types = db.query(Publication.type, func.count(Publication.id)).group_by(Publication.type).all()
        type_counts = {t or "Unknown": c for t, c in types}
        statuses = db.query(Publication.status, func.count(Publication.id)).group_by(Publication.status).all()
        status_counts = {s or "Unknown": c for s, c in statuses}

    return {
        "total_publications": total,
        "type_counts": type_counts,
        "status_counts": status_counts,
    }


# ─────────────────────────────────────────────────────
# RESEARCHERS REPORT  (role-filtered)
# ─────────────────────────────────────────────────────
def get_research_report(db: Session, current_user: User = None):
    role = _get_role(current_user) if current_user else "SystemAdmin"

    if role == "Researcher":
        researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        collaborator_ids = set()
        if researcher:
            pub_ids = [r[0] for r in db.query(PublicationAuthor.publication_id).filter(
                PublicationAuthor.researcher_id == researcher.id).all()]
            proj_ids = [r[0] for r in db.query(ProjectMember.project_id).filter(
                ProjectMember.researcher_id == researcher.id).all()]
            if pub_ids:
                for row in db.query(PublicationAuthor.researcher_id).filter(
                    PublicationAuthor.publication_id.in_(pub_ids),
                    PublicationAuthor.researcher_id != researcher.id,
                ).all():
                    collaborator_ids.add(row[0])
            if proj_ids:
                for row in db.query(ProjectMember.researcher_id).filter(
                    ProjectMember.project_id.in_(proj_ids),
                    ProjectMember.researcher_id != researcher.id,
                ).all():
                    collaborator_ids.add(row[0])

        collaborators = db.query(Researcher).filter(Researcher.id.in_(collaborator_ids)).all()
        dep_counts: dict = {}
        for r in collaborators:
            dep = db.query(Department).filter(Department.id == r.department_id).first()
            dep_name = dep.name if dep else "Unassigned"
            dep_counts[dep_name] = dep_counts.get(dep_name, 0) + 1

        skills_set: set = set()
        if researcher and researcher.skills:
            for s in researcher.skills.split(","):
                s = s.strip()
                if s:
                    skills_set.add(s)

        return {
            "total_researchers": len(collaborator_ids),
            "department_counts": dep_counts,
            "skills_summary": sorted(list(skills_set))[:20],
            "label_override": "My Collaborators",
        }

    elif role == "InstitutionAdmin":
        researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        inst_id = researcher.institution_id if researcher else None
        if not inst_id:
            first_inst = db.query(Institution).first()
            inst_id = first_inst.id if first_inst else None

        if not inst_id:
            return {"total_researchers": 0, "department_counts": {}, "skills_summary": [], "label_override": "Institution Researchers"}

        researchers = db.query(Researcher).filter(Researcher.institution_id == inst_id).all()
        dep_counts: dict = {}
        skills_set: set = set()
        for r in researchers:
            dep = db.query(Department).filter(Department.id == r.department_id).first()
            dep_name = dep.name if dep else "Unassigned"
            dep_counts[dep_name] = dep_counts.get(dep_name, 0) + 1
            if r.skills:
                for s in r.skills.split(","):
                    s = s.strip()
                    if s:
                        skills_set.add(s)

        return {
            "total_researchers": len(researchers),
            "department_counts": dep_counts,
            "skills_summary": sorted(list(skills_set))[:20],
            "label_override": "Institution Researchers",
        }

    else:
        # SystemAdmin — global
        total = db.query(Researcher).count()
        deps = db.query(Department.name, func.count(Researcher.id)).join(
            Researcher, Researcher.department_id == Department.id, isouter=True
        ).group_by(Department.name).all()
        department_counts = {d or "Unassigned": c for d, c in deps if c > 0}
        all_skills = db.query(Researcher.skills).filter(Researcher.skills.isnot(None)).all()
        unique_skills: set = set()
        for row in all_skills:
            for skill in row[0].split(","):
                s = skill.strip()
                if s:
                    unique_skills.add(s)
        return {
            "total_researchers": total,
            "department_counts": department_counts,
            "skills_summary": sorted(list(unique_skills))[:20],
        }


# ─────────────────────────────────────────────────────
# COLLABORATIONS REPORT  (role-filtered)
# ─────────────────────────────────────────────────────
def get_collaboration_report(db: Session, current_user: User = None):
    role = _get_role(current_user) if current_user else "SystemAdmin"

    if role == "Researcher":
        # Researcher sees collaborations of their institution (if linked) or just totals
        researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        inst_id = researcher.institution_id if researcher else None
        if inst_id:
            collabs = db.query(Collaboration).filter(
                or_(Collaboration.institution_1_id == inst_id, Collaboration.institution_2_id == inst_id)
            ).all()
        else:
            collabs = []
        total = len(collabs)
        type_counts: dict = {}
        for c in collabs:
            t = c.type or "General"
            type_counts[t] = type_counts.get(t, 0) + 1
        return {"total_collaborations": total, "type_counts": type_counts}

    elif role == "InstitutionAdmin":
        researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        inst_id = researcher.institution_id if researcher else None
        if not inst_id:
            first_inst = db.query(Institution).first()
            inst_id = first_inst.id if first_inst else None

        if not inst_id:
            return {"total_collaborations": 0, "type_counts": {}}

        collabs = db.query(Collaboration).filter(
            or_(Collaboration.institution_1_id == inst_id, Collaboration.institution_2_id == inst_id)
        ).all()
        total = len(collabs)
        type_counts: dict = {}
        for c in collabs:
            t = c.type or "General"
            type_counts[t] = type_counts.get(t, 0) + 1
        return {"total_collaborations": total, "type_counts": type_counts}

    else:
        # SystemAdmin — global
        total = db.query(Collaboration).count()
        types = db.query(Collaboration.type, func.count(Collaboration.id)).group_by(Collaboration.type).all()
        type_counts = {t or "General": c for t, c in types}
        return {"total_collaborations": total, "type_counts": type_counts}


# ─────────────────────────────────────────────────────
# INSTITUTIONS REPORT  (role-filtered)
# ─────────────────────────────────────────────────────
def get_institution_report(db: Session, current_user: User = None):
    role = _get_role(current_user) if current_user else "SystemAdmin"

    if role == "Researcher":
        researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        if not researcher or not researcher.institution_id:
            return {
                "total_institutions": 0,
                "total_departments": 0,
                "researcher_counts_by_institution": {},
            }
        inst = db.query(Institution).filter(Institution.id == researcher.institution_id).first()
        dep_count = db.query(Department).filter(Department.institution_id == researcher.institution_id).count()
        res_count = db.query(Researcher).filter(Researcher.institution_id == researcher.institution_id).count()
        return {
            "total_institutions": 1,
            "total_departments": dep_count,
            "researcher_counts_by_institution": {inst.name if inst else "My Institution": res_count},
        }

    elif role == "InstitutionAdmin":
        researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        inst_id = researcher.institution_id if researcher else None
        if not inst_id:
            first_inst = db.query(Institution).first()
            inst_id = first_inst.id if first_inst else None

        if not inst_id:
            return {"total_institutions": 0, "total_departments": 0, "researcher_counts_by_institution": {}}

        inst = db.query(Institution).filter(Institution.id == inst_id).first()
        dep_count = db.query(Department).filter(Department.institution_id == inst_id).count()
        res_count = db.query(Researcher).filter(Researcher.institution_id == inst_id).count()
        return {
            "total_institutions": 1,
            "total_departments": dep_count,
            "researcher_counts_by_institution": {inst.name if inst else "Institution": res_count},
        }

    else:
        # SystemAdmin — global
        total_inst = db.query(Institution).count()
        total_dep = db.query(Department).count()
        insts = db.query(Institution.name, func.count(Researcher.id)).join(
            Researcher, Researcher.institution_id == Institution.id, isouter=True
        ).group_by(Institution.name).all()
        researcher_counts_by_institution = {i or "External": c for i, c in insts if c > 0}
        return {
            "total_institutions": total_inst,
            "total_departments": total_dep,
            "researcher_counts_by_institution": researcher_counts_by_institution,
        }


# ─────────────────────────────────────────────────────
# CSV / PDF EXPORTS  (role-filtered)
# ─────────────────────────────────────────────────────
def generate_csv_export(db: Session, report_type: str, current_user: User = None) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "publications":
        writer.writerow(["ID", "Title", "Type", "Status", "DOI", "Uploaded By", "Created At"])
        rep = get_publication_report(db, current_user)
        # for CSV we need actual rows — re-query with same filters
        role = _get_role(current_user) if current_user else "SystemAdmin"
        if role == "Researcher":
            researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
            pub_ids = [r[0] for r in db.query(PublicationAuthor.publication_id).filter(
                PublicationAuthor.researcher_id == researcher.id).all()] if researcher else []
            own_filter = [Publication.uploaded_by == current_user.id]
            if pub_ids:
                own_filter.append(Publication.id.in_(pub_ids))
            pubs = db.query(Publication).filter(or_(*own_filter)).all()
        elif role == "InstitutionAdmin":
            researcher = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
            inst_id = researcher.institution_id if researcher else None
            if not inst_id:
                inst_id = (db.query(Institution).first() or Institution()).id
            res_ids = [r[0] for r in db.query(Researcher.id).filter(Researcher.institution_id == inst_id).all()]
            pub_ids = [r[0] for r in db.query(PublicationAuthor.publication_id).filter(
                PublicationAuthor.researcher_id.in_(res_ids)).distinct().all()] if res_ids else []
            pubs = db.query(Publication).filter(Publication.id.in_(pub_ids)).all() if pub_ids else []
        else:
            pubs = db.query(Publication).all()
        for p in pubs:
            writer.writerow([p.id, p.title, p.type, p.status, p.doi or "", p.uploaded_by, p.created_at])

    elif report_type == "researchers":
        writer.writerow(["ID", "Full Name", "ORCID ID", "Institution ID", "Department ID", "Skills", "Interests"])
        role = _get_role(current_user) if current_user else "SystemAdmin"
        if role == "InstitutionAdmin":
            researcher_obj = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
            inst_id = researcher_obj.institution_id if researcher_obj else None
            res_list = db.query(Researcher).filter(Researcher.institution_id == inst_id).all() if inst_id else []
        elif role == "Researcher":
            researcher_obj = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
            res_list = [researcher_obj] if researcher_obj else []
        else:
            res_list = db.query(Researcher).all()
        for r in res_list:
            writer.writerow([r.id, r.full_name, r.orcid_id or "", r.institution_id or "", r.department_id or "", r.skills or "", r.research_interests or ""])

    elif report_type == "collaborations":
        writer.writerow(["ID", "Title", "Type", "Status", "Institution 1 ID", "Institution 2 ID", "Start Date", "End Date"])
        role = _get_role(current_user) if current_user else "SystemAdmin"
        if role in ("Researcher", "InstitutionAdmin"):
            researcher_obj = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
            inst_id = researcher_obj.institution_id if researcher_obj else None
            cols = db.query(Collaboration).filter(
                or_(Collaboration.institution_1_id == inst_id, Collaboration.institution_2_id == inst_id)
            ).all() if inst_id else []
        else:
            cols = db.query(Collaboration).all()
        for c in cols:
            writer.writerow([c.id, c.title, c.type or "", c.status, c.institution_1_id, c.institution_2_id, c.start_date or "", c.end_date or ""])

    elif report_type == "institutions":
        writer.writerow(["ID", "Name", "Type", "Address", "Website"])
        role = _get_role(current_user) if current_user else "SystemAdmin"
        if role in ("Researcher", "InstitutionAdmin"):
            researcher_obj = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
            inst_id = researcher_obj.institution_id if researcher_obj else None
            insts = db.query(Institution).filter(Institution.id == inst_id).all() if inst_id else []
        else:
            insts = db.query(Institution).all()
        for i in insts:
            writer.writerow([i.id, i.name, i.type or "", i.address or "", i.website or ""])
    else:
        writer.writerow(["Unsupported report type"])

    return output.getvalue()


from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_export(db: Session, report_type: str, current_user: User = None) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica-Bold',
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=14,
    )
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#1e40af'),
        fontName='Helvetica-Bold',
        spaceBefore=10,
        spaceAfter=6,
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
    )
    header_cell_style = ParagraphStyle(
        'TableHeaderCell',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.white,
        fontName='Helvetica-Bold',
    )

    role = _get_role(current_user) if current_user else "SystemAdmin"

    story.append(Paragraph("SCIENTIFIC COLLABORATION NETWORK ANALYZER", subtitle_style))
    story.append(Paragraph(f"{report_type.capitalize()} Executive Report", title_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y at %H:%M')} | Role Scope: <b>{role}</b>", subtitle_style))
    story.append(Spacer(1, 8))

    if report_type == "publications":
        rep = get_publication_report(db, current_user)
        story.append(Paragraph(f"<b>Total Tracked Publications:</b> {rep['total_publications']}", section_style))
        
        type_rows = [[Paragraph("Publication Format", header_cell_style), Paragraph("Count", header_cell_style)]]
        for t, c in rep["type_counts"].items():
            type_rows.append([Paragraph(str(t), cell_style), Paragraph(str(c), cell_style)])
        
        t1 = Table(type_rows, colWidths=[300, 200])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(Paragraph("Publication Types", section_style))
        story.append(t1)
        story.append(Spacer(1, 14))

        status_rows = [[Paragraph("Status", header_cell_style), Paragraph("Count", header_cell_style)]]
        for s, c in rep["status_counts"].items():
            status_rows.append([Paragraph(str(s), cell_style), Paragraph(str(c), cell_style)])
        
        t2 = Table(status_rows, colWidths=[300, 200])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f766e')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(Paragraph("Publication Statuses", section_style))
        story.append(t2)

    elif report_type == "researchers":
        rep = get_research_report(db, current_user)
        label = rep.get("label_override", "Researchers")
        story.append(Paragraph(f"<b>Total {label}:</b> {rep['total_researchers']}", section_style))
        
        dep_rows = [[Paragraph("Department", header_cell_style), Paragraph("Researcher Count", header_cell_style)]]
        for d, c in rep["department_counts"].items():
            dep_rows.append([Paragraph(str(d), cell_style), Paragraph(str(c), cell_style)])
        
        t1 = Table(dep_rows, colWidths=[300, 200])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#047857')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(Paragraph("Department Breakdown", section_style))
        story.append(t1)
        story.append(Spacer(1, 14))

        if rep.get("skills_summary"):
            story.append(Paragraph("Top Research Skills Identified", section_style))
            skills_str = ", ".join(rep["skills_summary"])
            story.append(Paragraph(skills_str, cell_style))

    elif report_type == "collaborations":
        rep = get_collaboration_report(db, current_user)
        story.append(Paragraph(f"<b>Total Partnerships / Collaborations:</b> {rep['total_collaborations']}", section_style))
        
        col_rows = [[Paragraph("Collaboration Type", header_cell_style), Paragraph("Count", header_cell_style)]]
        for t, c in rep["type_counts"].items():
            col_rows.append([Paragraph(str(t), cell_style), Paragraph(str(c), cell_style)])
        
        t1 = Table(col_rows, colWidths=[300, 200])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6d28d9')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(Paragraph("Type Distribution", section_style))
        story.append(t1)

    elif report_type == "institutions":
        rep = get_institution_report(db, current_user)
        story.append(Paragraph(f"<b>Total Institutions:</b> {rep['total_institutions']} | <b>Departments:</b> {rep['total_departments']}", section_style))
        
        inst_rows = [[Paragraph("Institution", header_cell_style), Paragraph("Researchers", header_cell_style)]]
        for i, c in rep["researcher_counts_by_institution"].items():
            inst_rows.append([Paragraph(str(i), cell_style), Paragraph(str(c), cell_style)])
        
        t1 = Table(inst_rows, colWidths=[300, 200])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#b45309')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(Paragraph("Researcher Distribution by Institution", section_style))
        story.append(t1)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes



# ─────────────────────────────────────────────────────
# SAVED REPORTS
# ─────────────────────────────────────────────────────
def create_saved_report(db: Session, data: SavedReportCreate, user_id: int) -> SavedReport:
    new_report = SavedReport(**data.model_dump(), created_by=user_id)
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report


def get_saved_reports(db: Session, current_user: User = None):
    """Each role sees only their own saved reports."""
    if current_user:
        return db.query(SavedReport).filter(SavedReport.created_by == current_user.id).all()
    return db.query(SavedReport).all()

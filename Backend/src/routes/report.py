from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from database import get_db
from schemas.report import (
    PublicationReportOut, ResearchReportOut, CollaborationReportOut, InstitutionReportOut,
    SavedReportCreate, SavedReportOut
)
from services import report, audit
from middleware.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/reports", tags=["Reports & Export"])


@router.get("/publications", response_model=PublicationReportOut)
def get_publication_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return report.get_publication_report(db, current_user)


@router.get("/researchers", response_model=ResearchReportOut)
def get_researcher_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return report.get_research_report(db, current_user)


@router.get("/collaborations", response_model=CollaborationReportOut)
def get_collaboration_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return report.get_collaboration_report(db, current_user)


@router.get("/institutions", response_model=InstitutionReportOut)
def get_institution_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return report.get_institution_report(db, current_user)


@router.get("/export/csv")
def export_csv(
    report_type: str = Query(..., description="publications, researchers, collaborations, institutions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    csv_data = report.generate_csv_export(db, report_type, current_user)
    audit.log_action(db, current_user.id, "EXPORT_CSV", "reports", None, f"Exported CSV report for {report_type}")
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"},
    )


@router.get("/export/pdf")
def export_pdf(
    report_type: str = Query(..., description="publications, researchers, collaborations, institutions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf_bytes = report.generate_pdf_export(db, report_type, current_user)
    audit.log_action(db, current_user.id, "EXPORT_PDF", "reports", None, f"Exported PDF report for {report_type}")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"},
    )


@router.post("/saved", response_model=SavedReportOut)
def create_saved_report(
    data: SavedReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rep = report.create_saved_report(db, data, current_user.id)
    audit.log_action(db, current_user.id, "CREATE_SAVED_REPORT", "saved_reports", rep.id, f"Saved report configuration: {rep.title}")
    return rep


@router.get("/saved", response_model=list[SavedReportOut])
def get_saved_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return report.get_saved_reports(db, current_user)

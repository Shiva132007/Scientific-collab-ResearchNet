from pydantic import BaseModel
from datetime import datetime

class CitationCreate(BaseModel):
    citing_publication_id: int
    cited_publication_id: int

class CitationOut(BaseModel):
    id: int
    citing_publication_id: int
    cited_publication_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

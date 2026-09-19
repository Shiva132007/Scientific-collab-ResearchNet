# 🔬 Scientific Collaboration Network Analyzer

> **A comprehensive enterprise platform for managing, analyzing, and visualizing academic research networks, inter-institutional collaborations, publication impact, and AI-assisted research discovery.**

---

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2.7-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1.1-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Option A: Quick Start with Docker Compose (Recommended)](#option-a-quick-start-with-docker-compose-recommended)
  - [Option B: Manual Setup (Local Development)](#option-b-manual-setup-local-development)
- [Database Seeding & Management](#-database-seeding--management)
- [Environment Configuration](#-environment-configuration)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [API Documentation](#-api-documentation)
- [License](#-license)

---

## 🌐 Overview

The **Scientific Collaboration Network Analyzer** (ResearchNet) is a production-ready, full-stack platform built for academic institutions, research facilities, and university departments. It empowers administrators and researchers to track collaborative scientific endeavors, analyze inter-institutional partnerships, map co-authorship networks, and evaluate research impact.

Whether monitoring publication throughput, managing multi-institutional grants, running AI-assisted collaborator searches, or visualizing academic connectivity graphs, ResearchNet provides a unified, secure, and intuitive web application.

---

## ✨ Key Features

### 🔐 1. Authentication & Granular RBAC
- **Multi-Tiered Roles**: System Admin, Institution Admin, Lead Investigator, Researcher, Student, and Auditor.
- **Security Protocols**: JWT authentication (OAuth2 with Bearer token format), Passlib Bcrypt password hashing, OTP verification, and institutional domain scoping.

### 🏢 2. Institution & Departmental Governance
- **Hierarchical Management**: Full organizational structure support for universities, institutes, departments, and research centers.
- **Institutional Analytics**: Real-time aggregation of active faculty, ongoing projects, total citations, and publication outputs per institution.

### 🔬 3. Researcher Profiles & Academic Metrics
- **Comprehensive Profiles**: Academic bio, ORCID integration, Google Scholar links, departmental affiliations, and research interest tagging.
- **Bibliometrics**: Automated tracking and rendering of h-index, i10-index, total citations, and co-author counts.

### 🚀 4. Project & Collaboration Management
- **Project Lifecycle**: Grant tracking, budget allocation, milestones, team member assignments, and role-based permissions (Lead Investigator, Co-PI, Contributor).
- **Collaboration Workflow**: Formal request process for inter-departmental and cross-institutional team requests with status transitions (`Pending`, `Approved`, `Rejected`).

### 📚 5. Publications & Co-Authorship Tracking
- **Metadata Management**: DOIs, journals, publication dates, abstracts, citation counts, and open-access status.
- **Author Ordering**: Multi-author association with exact authorship positions and verified institutional affiliations.

### 🕸️ 6. Interactive Network Graph Visualization
- **Visual Collaboration Maps**: Dynamic node-link diagrams depicting relationships between researchers, projects, and partner institutions.
- **Graph Metrics**: Network density, centrality scoring, and cluster detection to surface research silos or key cross-disciplinary connectors.

### 🤖 7. AI Research Assistant
- **Collaborator Discovery**: AI recommendation algorithms matching project requirements with optimal co-authors based on domain expertise and past performance.
- **Citation Predictors & Summarizers**: Machine learning helpers for generating abstract summaries and forecasting citation trajectories.

### 📊 8. Reports & Audit Compliance
- **Custom Reporting**: Exportable institutional impact summaries, financial budget distribution, and publication performance reports in PDF and CSV formats.
- **Audit Logging**: Immutable system event logging tracking role modifications, access logs, and data mutations for compliance readiness.

### 🔔 9. Real-Time WebSocket Notifications
- Live alerts for collaboration requests, co-authorship invitations, project status changes, and citation milestones.

---

## 🏗 System Architecture

```
                                  +---------------------------------------+
                                  |            Client Browser             |
                                  |     React 19 + Vite (Port 5173/80)    |
                                  +-------------------+-------------------+
                                                      |
                                          HTTP / REST | WebSocket (/ws)
                                                      v
                                  +-------------------+-------------------+
                                  |         FastAPI Web Backend           |
                                  |           (Port 8000)                 |
                                  |  - RBAC Middleware                    |
                                  |  - Router & Pydantic Validation       |
                                  |  - WebSocket Connection Manager       |
                                  +---------+-------------------+---------+
                                            |                   |
                                            v                   v
+-------------------------------+ +---------+---------+ +-----+-----+
|         AI Services           | |   SQLAlchemy 2.0  | | File    |
| (Collaborator Match & Summary)| |      ORM Layer    | | Uploads |
+-------------------------------+ +---------+---------+ +-----------+
                                            |
                                            v
                                  +---------+---------+
                                  |    PostgreSQL     |
                                  | Database (Port    |
                                  |    5432)          |
                                  +-------------------+
```

---

## 🛠 Tech Stack

### **Backend**
- **Framework**: [FastAPI 0.115](https://fastapi.tiangolo.com/) (Python 3.10+)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Database**: [PostgreSQL 15](https://www.postgresql.org/)
- **Authentication**: JWT (`python-jose`), Passlib (Bcrypt)
- **Data Validation**: Pydantic v2
- **Real-Time Communication**: Async WebSockets

### **Frontend**
- **Library**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **Styling**: Custom CSS3 design system with responsive layouts, dark mode palettes, and glassmorphism components
- **Web Server (Production)**: Nginx (Dockerized container)

### **DevOps & Tooling**
- **Containerization**: Docker & Docker Compose
- **Database Scripts**: Custom seeders, schema verifiers, and reset utilities
- **Testing**: Python unit & integration test suites

---

## 📁 Project Directory Structure

```
Scientific-collab-ResearchNet/
├── Backend/
│   ├── src/
│   │   ├── middleware/        # Authentication & RBAC validation middleware
│   │   ├── models/            # SQLAlchemy ORM database models
│   │   ├── routes/            # REST API endpoint definitions
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic, AI engine, reports, notifications
│   │   ├── database.py        # DB session setup & initialization logic
│   │   └── websocket_manager.py # WebSocket connections registry
│   ├── uploads/               # User-uploaded files (avatars, attachments)
│   ├── check_database.py      # Database verification script
│   ├── reset_database.py      # Database wipe & reset utility
│   ├── seed_all.py            # Comprehensive mock data generator
│   ├── test_*.py              # Test suites (RBAC, AI, Reports, Integrations)
│   ├── main.py                # FastAPI entry point
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # Backend container setup
├── Frontend/
│   ├── public/                # Static web assets
│   ├── src/
│   │   ├── api/               # Axios API service instances
│   │   ├── components/        # Reusable UI components & navigation
│   │   ├── context/           # React context providers (Auth, Theme, Socket)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Page views (Dashboard, NetworkGraph, Projects, etc.)
│   │   └── styles/            # Component styles & design system CSS
│   ├── nginx.conf             # Nginx reverse proxy configuration
│   ├── package.json           # Node.js dependencies & scripts
│   ├── vite.config.js         # Vite configuration
│   └── Dockerfile             # Frontend multi-stage container build
├── docs/                      # Architectural documentation & presentation guides
├── docker-compose.yml         # Multi-container orchestration specification
├── .env.example               # Template for environment variables
└── README.md                  # System documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local environment:
- **Node.js** (v18.0.0 or higher) & `npm`
- **Python** (v3.10 or higher) & `pip`
- **PostgreSQL** (v14 or higher) *[Optional if using Docker]*
- **Docker Desktop** *[Recommended for quick start]*

---

### Option A: Quick Start with Docker Compose (Recommended)

Spin up the entire stack (PostgreSQL database, FastAPI backend, and React/Nginx frontend) in a single command:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/Scientific-collab-ResearchNet.git
   cd Scientific-collab-ResearchNet
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Launch containers**:
   ```bash
   docker-compose up --build -d
   ```

4. **Access the application**:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend REST API**: [http://localhost:8000](http://localhost:8000)
   - **Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

5. **Stop containers**:
   ```bash
   docker-compose down
   ```

---

### Option B: Manual Setup (Local Development)

#### Step 1: Database Setup

Ensure PostgreSQL service is running locally, then create a target database:
```sql
CREATE DATABASE collaboration_db;
```

---

#### Step 2: Backend Setup

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```

2. Create and activate a virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables in `Backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/collaboration_db
   SECRET_KEY=your-super-secret-key-change-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE=60
   ```

5. Seed database with rich sample data:
   ```bash
   python seed_all.py
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

---

#### Step 3: Frontend Setup

1. Open a new terminal and navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```

2. Install Node modules:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄 Database Seeding & Management

The repository includes helper scripts located in `Backend/` to simplify database management:

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Seed Database** | `python seed_all.py` | Populates database with institutions, departments, researchers, projects, publications, citations, and collaboration graphs. |
| **Check Database** | `python check_database.py` | Verifies DB connections, table schemas, row counts, and foreign key integrity. |
| **Reset Database** | `python reset_database.py` | Clears all existing data tables and drops schemas safely for a clean slate. |

---

## ⚙️ Environment Configuration

Refer to [`.env.example`](file:///e:/Scientific-collab-ResearchNet/.env.example) for a full template of required variables. Copy `.env.example` to `.env` in your root or `Backend/` directory before running the application.

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Backend | PostgreSQL connection string (`postgresql://<user>:<password>@<host>:<port>/<dbname>`) |
| `SECRET_KEY` | Backend | Secret key used for signing JWT tokens |
| `ALGORITHM` | Backend | Hashing algorithm for JWT encryption (Default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE` | Backend | Expiration duration for access tokens in minutes (Default: `60`) |
| `VITE_API_BASE_URL` | Frontend | Base HTTP URL endpoint of the FastAPI backend service |

---

## 🧪 Testing & Quality Assurance

The backend includes test suites targeting core operational logic, security compliance, and reporting pipelines.

To execute tests, navigate to `Backend/` with your virtual environment activated:

```bash
# Test Role-Based Access Control (RBAC) permissions
python test_rbac.py

# Test PDF/CSV report generation engine
python test_reports.py

# Test AI Assistant endpoints and recommendation service
python test_ai_assistant.py

# Test system-wide module integration
python test_integrations.py

# Test core Tier 1 and Tier 2 functionality
python test_tier1_tier2.py
```

---

## 📖 API Documentation

FastAPI automatically generates interactive, OpenAPI-compliant documentation accessible directly in your web browser when the backend is running:

- **Swagger UI (Interactive Testing)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc (Detailed Specifications)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more details.

---

<p align="center">
  Crafted with ❤️ for Scientific Research & Higher Education Advancement.
</p>

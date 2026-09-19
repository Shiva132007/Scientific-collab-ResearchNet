"""
seed_all.py — Full dummy-data seed for Scientific Collaboration Network Analyzer
===============================================================================
Run from the Backend/ folder:
    python seed_all.py

What it creates (idempotent — safe to run multiple times):
  • 3 Institutions
  • 9 Departments (3 per institution)
  • 3 Admin users  (1 SystemAdmin + 2 InstitutionAdmin, one per institution)
  • 12 Researcher users (4 per institution, spread across departments)
  • 30 Publications (various types & statuses)
  • 40 PublicationAuthor links
  • 6 Collaborations between institutions
  • 6 Projects (2 per institution)
  • ProjectMember assignments
  • 6 Conferences + ConferenceParticipation rows

All accounts use password: Password123!
"""

import sys
import os
from datetime import date, datetime

sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from database import SessionLocal, engine, Base
import models  # ensures all models are registered

from models.user         import User, UserRole
from models.institution  import Institution
from models.department   import Department
from models.researcher   import Researcher
from models.publication  import Publication, PublicationAuthor
from models.collaboration import Collaboration
from models.project      import Project, ProjectMember
from models.conference   import Conference, ConferenceParticipation
from middleware.auth     import hash_password

PWD = "Password123!"

# ── helpers ──────────────────────────────────────────
def get_or_create(db, model, filter_kwargs, create_kwargs=None):
    obj = db.query(model).filter_by(**filter_kwargs).first()
    if obj:
        return obj, False
    obj = model(**(create_kwargs or filter_kwargs))
    db.add(obj)
    db.flush()
    return obj, True

def log(msg):
    print(f"  {msg}")

# ═══════════════════════════════════════════════════
# DATA DEFINITIONS
# ═══════════════════════════════════════════════════

INSTITUTIONS = [
    {"name": "MIT Research Institute",       "type": "University",     "address": "Cambridge, MA, USA",       "website": "https://mit.edu"},
    {"name": "Stanford Tech Consortium",     "type": "University",     "address": "Stanford, CA, USA",        "website": "https://stanford.edu"},
    {"name": "Oxford Science Foundation",    "type": "Research Center","address": "Oxford, OX1, UK",          "website": "https://ox.ac.uk"},
]

DEPARTMENTS = [
    # MIT (index 0)
    {"name": "Computer Science",           "description": "AI, ML, distributed systems, and HCI research.", "inst_idx": 0},
    {"name": "Biomedical Engineering",     "description": "Medical devices, genomics, and bioinformatics.",  "inst_idx": 0},
    {"name": "Quantum Physics",            "description": "Quantum computing, photonics, and nanotechnology.", "inst_idx": 0},
    # Stanford (index 1)
    {"name": "Data Science & Analytics",   "description": "Big data, statistics, and ML pipelines.",        "inst_idx": 1},
    {"name": "Electrical Engineering",     "description": "Power systems, signal processing, IoT.",         "inst_idx": 1},
    {"name": "Environmental Science",      "description": "Climate modeling, sustainability, remote sensing.", "inst_idx": 1},
    # Oxford (index 2)
    {"name": "Mathematics & Computation",  "description": "Pure maths, computational theory, cryptography.", "inst_idx": 2},
    {"name": "Neuroscience",               "description": "Brain imaging, cognitive science, neural networks.", "inst_idx": 2},
    {"name": "Chemistry & Materials",      "description": "Organic chemistry, polymer science, catalysis.", "inst_idx": 2},
]

ADMIN_USERS = [
    {"email": "sysadmin@scna.dev",      "role": UserRole.system_admin,        "name": "System Administrator"},
    {"email": "admin.mit@scna.dev",     "role": UserRole.institution_admin,   "name": "MIT Admin",     "inst_idx": 0},
    {"email": "admin.stanford@scna.dev","role": UserRole.institution_admin,   "name": "Stanford Admin","inst_idx": 1},
]

RESEARCHERS = [
    # MIT — CS dept (dept_idx 0)
    {"email": "alice.chen@mit.edu",       "name": "Alice Chen",        "inst_idx": 0, "dept_idx": 0,
     "skills": "Python, Machine Learning, Deep Learning, NLP",
     "interests": "Natural Language Processing, Transformer Models",
     "bio": "Specializes in large language model research and NLP applications.", "orcid": "0000-0001-1001-0001"},
    {"email": "bob.martin@mit.edu",       "name": "Bob Martin",        "inst_idx": 0, "dept_idx": 0,
     "skills": "C++, Systems Programming, Distributed Systems, Kubernetes",
     "interests": "Cloud Computing, Fault-tolerant Systems",
     "bio": "Distributed systems researcher with a focus on consensus algorithms.", "orcid": "0000-0001-1001-0002"},
    # MIT — Biomedical (dept_idx 1)
    {"email": "carol.ramos@mit.edu",      "name": "Carol Ramos",       "inst_idx": 0, "dept_idx": 1,
     "skills": "Bioinformatics, R, Genomics, CRISPR",
     "interests": "Gene Editing, Precision Medicine",
     "bio": "Researches CRISPR-based gene therapies and genome sequencing pipelines.", "orcid": "0000-0001-1001-0003"},
    {"email": "dan.osei@mit.edu",         "name": "Dan Osei",          "inst_idx": 0, "dept_idx": 1,
     "skills": "Medical Imaging, TensorFlow, Signal Processing",
     "interests": "AI in Healthcare, Medical Device Design",
     "bio": "Develops AI-assisted diagnostic tools for radiology.", "orcid": "0000-0001-1001-0004"},
    # Stanford — Data Science (dept_idx 3)
    {"email": "emma.li@stanford.edu",     "name": "Emma Li",           "inst_idx": 1, "dept_idx": 3,
     "skills": "Python, Spark, SQL, Statistics, Data Visualization",
     "interests": "Big Data, Causal Inference, Econometrics",
     "bio": "Statistical learning researcher with expertise in high-dimensional data.", "orcid": "0000-0001-2001-0001"},
    {"email": "felix.okafor@stanford.edu","name": "Felix Okafor",      "inst_idx": 1, "dept_idx": 3,
     "skills": "R, Machine Learning, Bayesian Statistics, Tableau",
     "interests": "Bayesian Networks, Decision Theory",
     "bio": "Probabilistic modeling researcher focused on uncertainty quantification.", "orcid": "0000-0001-2001-0002"},
    # Stanford — Electrical Engineering (dept_idx 4)
    {"email": "grace.park@stanford.edu",  "name": "Grace Park",        "inst_idx": 1, "dept_idx": 4,
     "skills": "MATLAB, VHDL, Signal Processing, FPGA Design",
     "interests": "5G Networks, Embedded Systems, IoT Security",
     "bio": "Embedded systems engineer researching low-power IoT architectures.", "orcid": "0000-0001-2001-0003"},
    {"email": "henry.wu@stanford.edu",    "name": "Henry Wu",          "inst_idx": 1, "dept_idx": 4,
     "skills": "Python, Power Electronics, Renewable Energy, SCADA",
     "interests": "Smart Grid, Energy Storage, Solar PV",
     "bio": "Works on smart grid optimization using reinforcement learning.", "orcid": "0000-0001-2001-0004"},
    # Oxford — Mathematics (dept_idx 6)
    {"email": "iris.jones@oxford.edu",    "name": "Iris Jones",        "inst_idx": 2, "dept_idx": 6,
     "skills": "Haskell, Cryptography, Number Theory, Formal Verification",
     "interests": "Post-Quantum Cryptography, Zero-Knowledge Proofs",
     "bio": "Researches cryptographic protocols and their quantum-resistance.", "orcid": "0000-0001-3001-0001"},
    {"email": "james.taylor@oxford.edu",  "name": "James Taylor",      "inst_idx": 2, "dept_idx": 6,
     "skills": "Python, Optimization, Graph Theory, Operations Research",
     "interests": "Network Flow, Combinatorial Optimization",
     "bio": "Applies graph algorithms to large-scale logistics and network problems.", "orcid": "0000-0001-3001-0002"},
    # Oxford — Neuroscience (dept_idx 7)
    {"email": "kate.morgan@oxford.edu",   "name": "Kate Morgan",       "inst_idx": 2, "dept_idx": 7,
     "skills": "fMRI Analysis, Python, MATLAB, Cognitive Science",
     "interests": "Working Memory, Decision Making, Brain Connectivity",
     "bio": "Investigates neural correlates of decision-making using fMRI.", "orcid": "0000-0001-3001-0003"},
    {"email": "leo.santos@oxford.edu",    "name": "Leo Santos",        "inst_idx": 2, "dept_idx": 7,
     "skills": "Deep Learning, EEG, Signal Processing, PyTorch",
     "interests": "Brain-Computer Interfaces, Neural Decoding",
     "bio": "Builds real-time BCI systems using deep learning for neural decoding.", "orcid": "0000-0001-3001-0004"},
]

PUBLICATIONS = [
    # Journal Articles
    {"title": "Attention Is All You Need: Revisiting Transformer Architectures",
     "type": "Journal Article", "status": "Published", "doi": "10.1000/pub001",
     "abstract": "A comprehensive study of transformer model variants and their scalability.",
     "pub_date": date(2024, 3, 15), "r_idx": [0, 1]},
    {"title": "CRISPR-Cas9 Off-Target Effects in Human Embryonic Cells",
     "type": "Journal Article", "status": "Published", "doi": "10.1000/pub002",
     "abstract": "Identifies off-target editing events and mitigation strategies.",
     "pub_date": date(2024, 1, 20), "r_idx": [2, 3]},
    {"title": "Quantum Error Correction via Surface Codes at Scale",
     "type": "Conference Paper", "status": "Published", "doi": "10.1000/pub003",
     "abstract": "Demonstrates fault-tolerant quantum computation using surface code architectures.",
     "pub_date": date(2023, 11, 5), "r_idx": [0]},
    {"title": "Causal Discovery in High-Dimensional Omics Data",
     "type": "Journal Article", "status": "Under Review", "doi": "10.1000/pub004",
     "abstract": "Proposes a PC-algorithm extension for biological pathway discovery.",
     "pub_date": None, "r_idx": [4, 5]},
    {"title": "5G NR Beamforming Optimization with Deep Reinforcement Learning",
     "type": "Conference Paper", "status": "Published", "doi": "10.1000/pub005",
     "abstract": "Multi-agent RL approach to adaptive beamforming in 5G base stations.",
     "pub_date": date(2024, 6, 1), "r_idx": [6, 7]},
    {"title": "Post-Quantum Key Encapsulation: A Survey",
     "type": "Review Article", "status": "Published", "doi": "10.1000/pub006",
     "abstract": "Comprehensive review of NIST PQC finalists and their implementation security.",
     "pub_date": date(2023, 9, 10), "r_idx": [8, 9]},
    {"title": "Neural Correlates of Working Memory in Prefrontal Cortex",
     "type": "Journal Article", "status": "Published", "doi": "10.1000/pub007",
     "abstract": "fMRI study revealing sustained activity patterns during n-back tasks.",
     "pub_date": date(2024, 2, 28), "r_idx": [10, 11]},
    {"title": "Distributed Consensus in Byzantine Fault-Tolerant Networks",
     "type": "Conference Paper", "status": "Published", "doi": "10.1000/pub008",
     "abstract": "PBFT variant achieving 40% throughput improvement under adversarial conditions.",
     "pub_date": date(2023, 12, 3), "r_idx": [1, 8]},
    {"title": "AI-Assisted Radiology: CNN Performance on Chest X-Ray Datasets",
     "type": "Journal Article", "status": "Accepted", "doi": "10.1000/pub009",
     "abstract": "Benchmarks ten CNN architectures on NIH ChestX-ray14 with radiologist comparison.",
     "pub_date": None, "r_idx": [3, 4]},
    {"title": "Graph Neural Networks for Drug-Target Interaction Prediction",
     "type": "Journal Article", "status": "Under Review", "doi": "10.1000/pub010",
     "abstract": "GNN framework achieving state-of-the-art on three DTI benchmarks.",
     "pub_date": None, "r_idx": [2, 10]},
    {"title": "Renewable Energy Forecasting with Gradient Boosting Ensembles",
     "type": "Conference Paper", "status": "Published", "doi": "10.1000/pub011",
     "abstract": "Short-term wind power forecasting using XGBoost and SHAP explanations.",
     "pub_date": date(2024, 4, 20), "r_idx": [7, 5]},
    {"title": "Zero-Knowledge Proofs for Blockchain Privacy",
     "type": "Technical Report", "status": "Published", "doi": "10.1000/pub012",
     "abstract": "zk-SNARK implementation benchmarks on EVM-compatible chains.",
     "pub_date": date(2023, 8, 15), "r_idx": [8]},
    {"title": "EEG-Based Motor Imagery Classification Using Temporal CNNs",
     "type": "Journal Article", "status": "Published", "doi": "10.1000/pub013",
     "abstract": "Temporal convolutional network outperforms CSP+SVM on BCI Competition IV.",
     "pub_date": date(2024, 5, 12), "r_idx": [11]},
    {"title": "Federated Learning with Differential Privacy for Medical Records",
     "type": "Conference Paper", "status": "Accepted", "doi": "10.1000/pub014",
     "abstract": "Privacy-preserving FL framework tested on MIMIC-III clinical data.",
     "pub_date": None, "r_idx": [0, 3]},
    {"title": "Smart Grid Stability Using Model Predictive Control",
     "type": "Journal Article", "status": "Published", "doi": "10.1000/pub015",
     "abstract": "MPC framework for frequency regulation in high-renewable-penetration grids.",
     "pub_date": date(2023, 10, 7), "r_idx": [7]},
    {"title": "Combinatorial Optimization via Quantum Approximate Optimization Algorithm",
     "type": "Technical Report", "status": "Draft", "doi": "10.1000/pub016",
     "abstract": "Benchmarks QAOA depth vs. approximation ratio for Max-Cut problems.",
     "pub_date": None, "r_idx": [9, 8]},
    {"title": "Genomic Variant Calling with Deep Learning on Long-Read Sequencing",
     "type": "Journal Article", "status": "Published", "doi": "10.1000/pub017",
     "abstract": "DeepVariant extension achieving 99.2% F1 on Nanopore data.",
     "pub_date": date(2024, 1, 30), "r_idx": [2]},
    {"title": "Adaptive MIMO Antenna Arrays for mmWave Indoor Localization",
     "type": "Conference Paper", "status": "Under Review", "doi": "10.1000/pub018",
     "abstract": "Sub-centimeter indoor positioning using 64-element mmWave array.",
     "pub_date": None, "r_idx": [6]},
    {"title": "Bayesian Optimization for Neural Architecture Search",
     "type": "Journal Article", "status": "Published", "doi": "10.1000/pub019",
     "abstract": "GP-based NAS approach reducing search time by 3× on CIFAR-100.",
     "pub_date": date(2024, 3, 8), "r_idx": [5, 4]},
    {"title": "Cognitive Load Assessment Using Pupillometry and EEG",
     "type": "Journal Article", "status": "Accepted", "doi": "10.1000/pub020",
     "abstract": "Multimodal physiological index predicts working memory load with 91% accuracy.",
     "pub_date": None, "r_idx": [10]},
    {"title": "Explainable AI for Credit Scoring in Microfinance",
     "type": "Technical Report", "status": "Published", "doi": "10.1000/pub021",
     "abstract": "LIME and SHAP applied to LightGBM credit scoring model for transparency.",
     "pub_date": date(2023, 7, 14), "r_idx": [4]},
    {"title": "Protein Structure Prediction with Graph Transformers",
     "type": "Journal Article", "status": "Under Review", "doi": "10.1000/pub022",
     "abstract": "Novel graph transformer architecture competitive with AlphaFold2.",
     "pub_date": None, "r_idx": [2, 9]},
    {"title": "Real-Time Anomaly Detection in Industrial IoT Streams",
     "type": "Conference Paper", "status": "Published", "doi": "10.1000/pub023",
     "abstract": "Edge-deployed LSTM autoencoder for predictive maintenance.",
     "pub_date": date(2024, 6, 25), "r_idx": [6, 1]},
    {"title": "Lattice-Based Signature Schemes: CRYSTALS-Dilithium Analysis",
     "type": "Review Article", "status": "Published", "doi": "10.1000/pub024",
     "abstract": "Security and performance analysis of CRYSTALS-Dilithium at NIST Level 3.",
     "pub_date": date(2023, 11, 20), "r_idx": [8]},
    {"title": "Cross-Modal Learning for Multimodal Sentiment Analysis",
     "type": "Conference Paper", "status": "Published", "doi": "10.1000/pub025",
     "abstract": "Fusion of text, audio, and video features for aspect-level sentiment detection.",
     "pub_date": date(2024, 5, 3), "r_idx": [0, 11]},
    {"title": "Solar Irradiance Nowcasting from Satellite Imagery",
     "type": "Journal Article", "status": "Draft", "doi": "10.1000/pub026",
     "abstract": "ConvLSTM model for 30-minute ahead solar energy forecasting.",
     "pub_date": None, "r_idx": [7]},
    {"title": "RAFT Consensus in Geo-Distributed Database Systems",
     "type": "Technical Report", "status": "Published", "doi": "10.1000/pub027",
     "abstract": "Latency-optimized RAFT implementation for cross-region replication.",
     "pub_date": date(2023, 6, 18), "r_idx": [1]},
    {"title": "fMRI Resting-State Network Analysis with ICA and Graph Theory",
     "type": "Journal Article", "status": "Published", "doi": "10.1000/pub028",
     "abstract": "Default mode network topology changes in MCI patients.",
     "pub_date": date(2024, 4, 11), "r_idx": [10, 11]},
    {"title": "Carbon Capture Material Optimization Using Genetic Algorithms",
     "type": "Conference Paper", "status": "Published", "doi": "10.1000/pub029",
     "abstract": "GA-driven MOF design achieving 2.4× CO2 uptake improvement.",
     "pub_date": date(2023, 9, 29), "r_idx": [5]},
    {"title": "Quantum Key Distribution over Metropolitan Fiber Networks",
     "type": "Journal Article", "status": "Draft", "doi": "10.1000/pub030",
     "abstract": "BB84 protocol implementation with 40km range and QBER < 2%.",
     "pub_date": None, "r_idx": [8, 9]},
]

COLLABORATIONS = [
    {"title": "AI & Biomedical Cross-Institutional Alliance",
     "desc": "Joint research on AI-driven biomedical diagnostics combining MIT's AI expertise and Stanford's data science.",
     "type": "Research Initiative", "status": "Active",
     "start": date(2023, 1, 1), "end": date(2025, 12, 31), "inst1": 0, "inst2": 1},
    {"title": "Quantum Cryptography Network Project",
     "desc": "Collaborative development of post-quantum cryptographic protocols.",
     "type": "Institutional Partnership", "status": "Active",
     "start": date(2023, 6, 1), "end": date(2026, 5, 31), "inst1": 0, "inst2": 2},
    {"title": "Sustainable Energy Research Consortium",
     "desc": "Renewable energy optimization and smart grid research between Stanford and Oxford.",
     "type": "Joint Venture", "status": "Active",
     "start": date(2024, 1, 1), "end": date(2026, 12, 31), "inst1": 1, "inst2": 2},
    {"title": "NeuroAI International Programme",
     "desc": "Brain-computer interface and cognitive neuroscience collaboration.",
     "type": "Research Initiative", "status": "Active",
     "start": date(2023, 9, 1), "end": date(2025, 8, 31), "inst1": 0, "inst2": 2},
    {"title": "Global Health Data Science Partnership",
     "desc": "Federated learning and privacy-preserving analytics for global health.",
     "type": "Institutional Partnership", "status": "Completed",
     "start": date(2022, 1, 1), "end": date(2023, 12, 31), "inst1": 0, "inst2": 1},
    {"title": "Computational Mathematics Exchange",
     "desc": "Joint PhD exchange and paper publication programme in combinatorial optimization.",
     "type": "Joint Venture", "status": "Active",
     "start": date(2024, 3, 1), "end": date(2027, 2, 28), "inst1": 1, "inst2": 2},
]

PROJECTS = [
    # MIT
    {"title": "LLM Alignment & Safety Research",
     "desc": "Investigating reward hacking, RLHF instability, and scalable oversight for large language models.",
     "agency": "DARPA", "budget": 2_400_000.0, "status": "Active",
     "start": date(2023, 9, 1), "end": date(2026, 8, 31), "inst_idx": 0,
     "members": [0, 1], "roles": ["Lead Investigator", "Researcher"]},
    {"title": "Genomic Medicine Pipeline Platform",
     "desc": "End-to-end cloud pipeline for WGS variant calling, annotation, and clinical reporting.",
     "agency": "NIH", "budget": 1_800_000.0, "status": "Active",
     "start": date(2024, 1, 1), "end": date(2026, 12, 31), "inst_idx": 0,
     "members": [2, 3], "roles": ["Lead Investigator", "Researcher"]},
    # Stanford
    {"title": "Federated Health Analytics Network",
     "desc": "Privacy-preserving distributed analytics across 20 hospital networks in the US.",
     "agency": "NSF", "budget": 3_100_000.0, "status": "Active",
     "start": date(2023, 6, 1), "end": date(2026, 5, 31), "inst_idx": 1,
     "members": [4, 5], "roles": ["Lead Investigator", "Contributor"]},
    {"title": "Next-Gen 5G Base Station Prototype",
     "desc": "mmWave 5G NR base station design with AI beamforming for urban dense deployment.",
     "agency": "NSF", "budget": 2_200_000.0, "status": "Active",
     "start": date(2024, 3, 1), "end": date(2027, 2, 28), "inst_idx": 1,
     "members": [6, 7], "roles": ["Lead Investigator", "Researcher"]},
    # Oxford
    {"title": "Post-Quantum Cryptography Standardization Aid",
     "desc": "Contributing formal security proofs and implementation testing to NIST PQC process.",
     "agency": "EPSRC", "budget": 1_500_000.0, "status": "Active",
     "start": date(2023, 4, 1), "end": date(2025, 3, 31), "inst_idx": 2,
     "members": [8, 9], "roles": ["Lead Investigator", "Researcher"]},
    {"title": "Neurodegeneration Biomarker Discovery",
     "desc": "Longitudinal MRI/EEG study identifying early biomarkers of Alzheimer's disease.",
     "agency": "Wellcome Trust", "budget": 2_750_000.0, "status": "Active",
     "start": date(2023, 10, 1), "end": date(2027, 9, 30), "inst_idx": 2,
     "members": [10, 11], "roles": ["Lead Investigator", "Researcher"]},
]

CONFERENCES = [
    {"name": "International Conference on Machine Learning",
     "acronym": "ICML", "year": 2024, "location": "Vienna, Austria",
     "website": "https://icml.cc", "start": date(2024, 7, 21), "end": date(2024, 7, 27),
     "participants": [(0, "Presenter", "Attention revisited"), (4, "Attendee", None), (5, "Poster", "Bayesian NAS")]},
    {"name": "Neural Information Processing Systems",
     "acronym": "NeurIPS", "year": 2023, "location": "New Orleans, LA, USA",
     "website": "https://neurips.cc", "start": date(2023, 12, 10), "end": date(2023, 12, 16),
     "participants": [(0, "Presenter", "LLM alignment"), (11, "Presenter", "EEG classification"), (10, "Attendee", None)]},
    {"name": "ACM CCS — Computer and Communications Security",
     "acronym": "CCS", "year": 2024, "location": "Salt Lake City, UT, USA",
     "website": "https://sigsac.org/ccs", "start": date(2024, 10, 14), "end": date(2024, 10, 18),
     "participants": [(8, "Presenter", "ZK Proofs"), (1, "Attendee", None)]},
    {"name": "IEEE International Symposium on Information Theory",
     "acronym": "ISIT", "year": 2024, "location": "Athens, Greece",
     "website": "https://isit2024.org", "start": date(2024, 7, 7), "end": date(2024, 7, 12),
     "participants": [(9, "Presenter", "QAOA bounds"), (6, "Presenter", "Beamforming")]},
    {"name": "Society for Neuroscience Annual Meeting",
     "acronym": "SfN", "year": 2023, "location": "Washington D.C., USA",
     "website": "https://sfn.org", "start": date(2023, 11, 11), "end": date(2023, 11, 15),
     "participants": [(10, "Keynote Speaker", "Working memory in PFC"), (11, "Presenter", "BCI systems")]},
    {"name": "International Conference on Learning Representations",
     "acronym": "ICLR", "year": 2024, "location": "Vienna, Austria",
     "website": "https://iclr.cc", "start": date(2024, 5, 7), "end": date(2024, 5, 11),
     "participants": [(0, "Presenter", "Federated LLM"), (3, "Attendee", None), (4, "Poster", "Causal discovery")]},
]

# ===================================================
# SEED FUNCTION
# ===================================================
def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("\n==============================================")
        print("  Scientific Collaboration Network - Full Seed")
        print("==============================================\n")

        # -- 1. Institutions --------------------------------
        print("Seeding Institutions...")
        inst_objs = []
        for i_data in INSTITUTIONS:
            obj, created = get_or_create(db, Institution, {"name": i_data["name"]}, i_data)
            if created:
                log(f"[NEW] {obj.name}")
            else:
                log(f"[OK]  {obj.name}")
            inst_objs.append(obj)
        db.commit()

        # -- 2. Departments ---------------------------------
        print("\nSeeding Departments...")
        dept_objs = []
        for d_data in DEPARTMENTS:
            inst = inst_objs[d_data["inst_idx"]]
            obj, created = get_or_create(
                db, Department,
                {"name": d_data["name"], "institution_id": inst.id},
                {"name": d_data["name"], "description": d_data["description"], "institution_id": inst.id},
            )
            if created:
                log(f"[NEW] {obj.name}  ({inst.name})")
            else:
                log(f"[OK]  {obj.name}  ({inst.name})")
            dept_objs.append(obj)
        db.commit()

        # -- 3. Admin users ---------------------------------
        print("\nSeeding Admin Accounts...")
        admin_user_objs = []
        for a in ADMIN_USERS:
            user, created = get_or_create(
                db, User, {"email": a["email"]},
                {"email": a["email"], "password_hash": hash_password(PWD), "role": a["role"]},
            )
            if created:
                log(f"[NEW] {a['email']}  ({a['role'].value})")
            else:
                log(f"[OK]  {a['email']}  ({user.role.value})")
            admin_user_objs.append((user, a))
        db.commit()

        # Create Researcher profiles for InstitutionAdmin users so role-scoped reports work
        for user, a in admin_user_objs:
            if a["role"] == UserRole.institution_admin and "inst_idx" in a:
                inst = inst_objs[a["inst_idx"]]
                r, created = get_or_create(
                    db, Researcher, {"user_id": user.id},
                    {"user_id": user.id, "institution_id": inst.id, "full_name": a["name"],
                     "bio": f"Institution administrator for {inst.name}."},
                )
                if created:
                    log(f"    -> Researcher profile created for admin ({inst.name})")
        db.commit()

        # -- 4. Researcher users ----------------------------
        print("\nSeeding Researcher Accounts...")
        researcher_objs = []
        for r_data in RESEARCHERS:
            user, created = get_or_create(
                db, User, {"email": r_data["email"]},
                {"email": r_data["email"], "password_hash": hash_password(PWD), "role": UserRole.researcher},
            )
            if created:
                log(f"[NEW] {r_data['email']}")
            else:
                log(f"[OK]  {r_data['email']}")

            inst = inst_objs[r_data["inst_idx"]]
            dept = dept_objs[r_data["dept_idx"]]
            res, created = get_or_create(
                db, Researcher, {"user_id": user.id},
                {
                    "user_id": user.id,
                    "institution_id": inst.id,
                    "department_id": dept.id,
                    "full_name": r_data["name"],
                    "bio": r_data.get("bio"),
                    "research_interests": r_data.get("interests"),
                    "skills": r_data.get("skills"),
                    "orcid_id": r_data.get("orcid"),
                },
            )
            if created:
                log(f"    -> Researcher profile: {res.full_name}  [{dept.name}]")
            researcher_objs.append(res)
        db.commit()

        # -- 5. Publications --------------------------------
        print("\nSeeding Publications...")
        pub_objs = []
        # Use the first admin user as "uploaded_by" fallback
        uploader_id = admin_user_objs[0][0].id
        for p_data in PUBLICATIONS:
            existing = db.query(Publication).filter(Publication.doi == p_data["doi"]).first()
            if existing:
                log(f"[OK]  {p_data['title'][:60]}...")
                pub_objs.append(existing)
                continue
            pub = Publication(
                title=p_data["title"],
                type=p_data["type"],
                status=p_data["status"],
                doi=p_data["doi"],
                abstract=p_data.get("abstract"),
                publication_date=p_data.get("pub_date"),
                uploaded_by=uploader_id,
                visible_to_others=True,
            )
            db.add(pub)
            db.flush()
            log(f"[NEW] {pub.title[:60]}...")
            pub_objs.append(pub)
        db.commit()

        # -- 6. Publication Authors -------------------------
        print("\nSeeding Publication Authors...")
        for i, p_data in enumerate(PUBLICATIONS):
            pub = pub_objs[i]
            for order, r_idx in enumerate(p_data.get("r_idx", [])):
                res = researcher_objs[r_idx]
                existing = db.query(PublicationAuthor).filter_by(
                    publication_id=pub.id, researcher_id=res.id
                ).first()
                if not existing:
                    pa = PublicationAuthor(
                        publication_id=pub.id,
                        researcher_id=res.id,
                        author_order=order + 1,
                        is_corresponding_author=(order == 0),
                    )
                    db.add(pa)
                    log(f"[NEW] {res.full_name} -> '{pub.title[:45]}...'")
        db.commit()

        # -- 7. Collaborations ------------------------------
        print("\nSeeding Collaborations...")
        for c_data in COLLABORATIONS:
            inst1 = inst_objs[c_data["inst1"]]
            inst2 = inst_objs[c_data["inst2"]]
            existing = db.query(Collaboration).filter_by(title=c_data["title"]).first()
            if existing:
                log(f"[OK]  {c_data['title'][:60]}")
                continue
            col = Collaboration(
                title=c_data["title"],
                description=c_data["desc"],
                type=c_data["type"],
                status=c_data["status"],
                start_date=c_data["start"],
                end_date=c_data["end"],
                institution_1_id=inst1.id,
                institution_2_id=inst2.id,
            )
            db.add(col)
            log(f"[NEW] {col.title[:60]}")
        db.commit()

        # -- 8. Projects ------------------------------------
        print("\nSeeding Projects...")
        proj_objs = []
        creator_id = admin_user_objs[0][0].id
        for p_data in PROJECTS:
            inst = inst_objs[p_data["inst_idx"]]
            existing = db.query(Project).filter_by(title=p_data["title"]).first()
            if existing:
                log(f"[OK]  {p_data['title'][:60]}")
                proj_objs.append(existing)
                continue
            proj = Project(
                title=p_data["title"],
                description=p_data["desc"],
                funding_agency=p_data["agency"],
                budget=p_data["budget"],
                status=p_data["status"],
                start_date=p_data["start"],
                end_date=p_data["end"],
                institution_id=inst.id,
                created_by=creator_id,
                visible_to_others=True,
            )
            db.add(proj)
            db.flush()
            log(f"[NEW] {proj.title[:60]}")
            proj_objs.append(proj)
        db.commit()

        # -- 9. Project Members -----------------------------
        print("\nSeeding Project Members...")
        for i, p_data in enumerate(PROJECTS):
            proj = proj_objs[i]
            for r_idx, role in zip(p_data["members"], p_data["roles"]):
                res = researcher_objs[r_idx]
                existing = db.query(ProjectMember).filter_by(project_id=proj.id, researcher_id=res.id).first()
                if not existing:
                    pm = ProjectMember(project_id=proj.id, researcher_id=res.id, role=role)
                    db.add(pm)
                    log(f"[NEW] {res.full_name} -> '{proj.title[:45]}...' ({role})")
        db.commit()

        # -- 10. Conferences --------------------------------
        print("\nSeeding Conferences...")
        for conf_data in CONFERENCES:
            existing = db.query(Conference).filter_by(acronym=conf_data["acronym"], year=conf_data["year"]).first()
            if existing:
                log(f"[OK]  {conf_data['acronym']} {conf_data['year']}")
                conf = existing
            else:
                conf = Conference(
                    name=conf_data["name"],
                    acronym=conf_data["acronym"],
                    year=conf_data["year"],
                    location=conf_data["location"],
                    website=conf_data["website"],
                    start_date=conf_data["start"],
                    end_date=conf_data["end"],
                )
                db.add(conf)
                db.flush()
                log(f"[NEW] {conf.name}")

            for r_idx, role, paper in conf_data["participants"]:
                res = researcher_objs[r_idx]
                existing_p = db.query(ConferenceParticipation).filter_by(
                    conference_id=conf.id, researcher_id=res.id
                ).first()
                if not existing_p:
                    cp = ConferenceParticipation(
                        conference_id=conf.id,
                        researcher_id=res.id,
                        role=role,
                        paper_title=paper,
                    )
                    db.add(cp)
                    log(f"    -> {res.full_name} ({role})")
        db.commit()

        # -- Summary ----------------------------------------
        print("\n==============================================")
        print("   Seed complete!\n")
        print(f"  Institutions   : {db.query(Institution).count()}")
        print(f"  Departments    : {db.query(Department).count()}")
        print(f"  Users          : {db.query(User).count()}")
        print(f"  Researchers    : {db.query(Researcher).count()}")
        print(f"  Publications   : {db.query(Publication).count()}")
        print(f"  Collaborations : {db.query(Collaboration).count()}")
        print(f"  Projects       : {db.query(Project).count()}")
        print(f"  Conferences    : {db.query(Conference).count()}")
        print("\n  Login Credentials (all use password: Password123!)")
        print("  Email                              | Role")
        print("  -----------------------------------|------------------")
        print("  sysadmin@scna.dev                  | System Admin")
        print("  admin.mit@scna.dev                 | Institution Admin")
        print("  admin.stanford@scna.dev            | Institution Admin")
        print("  alice.chen@mit.edu                 | Researcher")
        print("  emma.li@stanford.edu               | Researcher")
        print("  iris.jones@oxford.edu              | Researcher")
        print("  (+ 9 more researcher accounts)     | Researcher")
        print()
        return
        print("  ┌──────────────────────────────────────┬────────────────────┐")
        print("  │ Email                                │ Role               │")
        print("  ├──────────────────────────────────────┼────────────────────┤")
        print("  │ sysadmin@scna.dev                    │ System Admin       │")
        print("  │ admin.mit@scna.dev                   │ Institution Admin  │")
        print("  │ admin.stanford@scna.dev              │ Institution Admin  │")
        print("  │ alice.chen@mit.edu                   │ Researcher         │")
        print("  │ emma.li@stanford.edu                 │ Researcher         │")
        print("  │ iris.jones@oxford.edu                │ Researcher         │")
        print("  │ (+ 6 more researcher accounts)       │ Researcher         │")
        print("  └──────────────────────────────────────┴────────────────────┘")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    finally:
        db.close()


if __name__ == "__main__":
    seed()

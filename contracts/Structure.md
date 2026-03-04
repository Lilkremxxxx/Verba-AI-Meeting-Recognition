my-project-repo/
├── contracts/
│   └── api.md                # [Diện Owner] Single Source of Truth cho API
├── backend/                  # FastAPI Project
│   ├── alembic/              # DB Migrations
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py       # [Diện] Dependencies (get_current_user)
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py     # [Diện] Register/Login routes
│   │   │   │   └── meetings.py # [Bằng & Duy Anh] Upload & List routes
│   │   │   └── api_router.py # [Diện] Gom các router lại
│   │   ├── core/
│   │   │   ├── config.py     # [Diện] Env vars, Settings
│   │   │   └── security.py   # [Diện] JWT, Password Hash
│   │   ├── db/
│   │   │   └── session.py    # [Diện] DB connection
│   │   ├── models/
│   │   │   ├── user.py       # [Diện] User Model
│   │   │   └── meeting.py    # [Bằng] Meeting Model (Duy Anh review)
│   │   ├── schemas/
│   │   │   ├── user.py       # [Diện] User Pydantic schemas
│   │   │   └── meeting.py    # [Duy Anh] Meeting Pydantic schemas (List/Upload)
│   │   ├── services/
│   │   │   ├── storage/
│   │   │   │   ├── base.py   # [Duy Anh] Abstract Interface
│   │   │   │   └── local.py  # [Bằng] Local implementation
│   │   └── main.py           # [Diện] App initialization, CORS
│   ├── uploads/              # [Bằng] Local storage folder (gitignored)
│   ├── requirements.txt      # [Diện] Python libs
│   └── .env.example          # [Diện] Config mẫu
└── frontend/                 # Vite + React Project
    ├── src/
    │   ├── api/
    │   │   ├── axiosClient.js # [Tuấn] Axios instance + Interceptor
    │   │   ├── auth.js        # [Tuấn] API Auth
    │   │   └── meetings.js    # [Nam] API Meetings (Mock -> Real)
    │   ├── components/
    │   │   ├── shared/        # Button, Input, Layout
    │   │   ├── auth/          # [Tuấn] LoginForm, RegisterForm
    │   │   └── dashboard/     # [Nam] UploadForm, MeetingList
    │   ├── context/
    │   │   └── AuthContext.jsx # [Tuấn] Global Auth State
    │   ├── pages/
    │   │   ├── Login.jsx      # [Tuấn]
    │   │   ├── Register.jsx   # [Tuấn]
    │   │   └── Dashboard.jsx  # [Nam]
    │   ├── App.jsx            # [Tuấn] Routing setup
    │   └── main.jsx
    └── package.json
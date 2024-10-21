from fastapi import FastAPI, HTTPException, Depends, status, Request, Form
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import List, Optional
import secrets
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

security = HTTPBasic()

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./todo_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    tasks = relationship("Task", back_populates="owner")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="tasks")


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(credentials: HTTPBasicCredentials = Depends(security), db: SessionLocal = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.username).first()
    if user is None or not secrets.compare_digest(user.hashed_password.encode("utf8"),
                                                  credentials.password.encode("utf8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user


@app.get("/")
async def read_root(request: Request, user: User = Depends(get_current_user)):
    return templates.TemplateResponse("index.html", {"request": request, "user": user})


@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@app.post("/register")
async def register(
        email: str = Form(...),
        password: str = Form(...),
        first_name: str = Form(...),
        last_name: str = Form(...),
        db: SessionLocal = Depends(get_db)
):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = secrets.token_hex(16)  # In a real app, use proper password hashing
    user = User(email=email, hashed_password=hashed_password, first_name=first_name, last_name=last_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered successfully"}


@app.get("/tasks")
async def get_tasks(user: User = Depends(get_current_user), db: SessionLocal = Depends(get_db)):
    tasks = db.query(Task).filter(Task.owner_id == user.id).all()
    return {"tasks": tasks}


@app.post("/tasks")
async def add_task(content: str = Form(...), user: User = Depends(get_current_user),
                   db: SessionLocal = Depends(get_db)):
    new_task = Task(content=content, owner_id=user.id)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return {"success": True, "task": new_task}


@app.put("/tasks/{task_id}")
async def update_task(
        task_id: int,
        content: Optional[str] = Form(None),
        completed: Optional[bool] = Form(None),
        user: User = Depends(get_current_user),
        db: SessionLocal = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.owner_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if content is not None:
        task.content = content
    if completed is not None:
        task.completed = completed
    db.commit()
    db.refresh(task)
    return {"success": True, "task": task}


@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int, user: User = Depends(get_current_user), db: SessionLocal = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.owner_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"success": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

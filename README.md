# 🎓 Online Learning Platform with AI Quiz Generation

A full-stack online learning platform that allows instructors to create and manage courses, lessons, quizzes, and certificates, while enabling students to enroll, learn, and assess their progress.  
The platform integrates **AI-generated quizzes**, **role-based access control**, and **automatic certificate generation**.

---

## 📌 Project Overview

This project is a modern **Online Learning Platform** built using a **React frontend** and an **ASP.NET Core Web API backend**, following clean architecture principles.

Key goals:
- Support multiple user roles (Admin, Instructor, Student)
- Allow instructors to manage educational content
- Provide AI-assisted quiz generation
- Track student enrollments and quiz results
- Generate professional course completion certificates (PDF)

---

## 🧩 Main Features

### 👥 User Roles

- **Admin**
  - Manage all courses
  - View enrollments
  - Delete courses

- **Instructor**
  - Create and manage courses and lessons
  - Publish and unpublish courses
  - View enrolled students
  - Generate quizzes manually or using AI
  - Review and approve AI-generated quizzes into the Question Bank

- **Student**
  - Browse and enroll in courses
  - Access lessons
  - Take quizzes
  - Receive certificates after course completion

---

## 🧠 AI Quiz Generation

The platform integrates **OpenAI** to automatically generate quiz questions from lesson content.

**AI workflow:**
1. Instructor selects a lesson
2. Lesson content is sent to OpenAI
3. AI returns structured MCQs in JSON format
4. Questions are stored as drafts
5. Instructor reviews, edits, and approves questions
6. Approved questions are saved permanently in the Question Bank

**AI safety mechanisms:**
- Strict JSON-only responses
- Validation and retry mechanism
- Rate-limit and quota handling
- Manual instructor approval before persistence

---

## 📄 Certificate Generation

Certificates are generated as **PDF files** using **QuestPDF**.

Features:
- Photoshop-designed SVG template
- Precise text placement using coordinate mapping
- Includes:
  - Student full name
  - Course title
  - Completion date
  - Unique certificate code

Certificates are generated server-side and returned as downloadable PDFs.

---

## 🏗️ System Architecture

```
Frontend (React + Vite)
        |
        | REST API (JSON, JWT)
        |
Backend (ASP.NET Core Web API)
        |
        | Entity Framework Core (ORM)
        |
Database (Microsoft SQL Server)
```

---

## 🧱 Backend Architecture

- ASP.NET Core Web API
- Clean separation of concerns:
  - Controllers
  - Services
  - DTOs
  - Domain Models
- Dependency Injection
- JWT-based Authentication
- Role-based Authorization
- Entity Framework Core for data access

---

## 🗄️ Database Management

- **Database Engine:** Microsoft SQL Server
- **ORM:** Entity Framework Core

**Key Relationships:**
- Course → Lessons
- Course → Enrollments
- Course → Question Banks
- Question Bank → Questions → Answer Options
- AI Drafts → Draft Questions → Draft Options

Entity Framework Core manages:
- Migrations
- Transactions
- Referential integrity
- LINQ-to-SQL translation

---

## 🔐 Authentication & Security

- JWT Authentication
- Claims-based identity
- Role-based authorization
- Secured API endpoints
- CORS policy configured for frontend access
- OpenAI API key stored securely in environment variables

---

## 🎨 Frontend

- React + Vite
- React Router with nested instructor and admin routes
- Role-based navigation and dashboards
- Protected routes
- API integration using `fetch`
- Clean and responsive UI for instructors and students

---

## ⚙️ Technologies Used

### Frontend
- React
- Vite
- React Router
- Bootstrap / Admin UI

### Backend
- ASP.NET Core Web API
- Entity Framework Core
- JWT Authentication
- QuestPDF
- OpenAI API

### Database
- Microsoft SQL Server

---

## 🚀 How to Run the Project

### Backend

1. Configure `appsettings.json`
2. Set the OpenAI API key:
   ```bash
   setx OPENAI_API_KEY "your_api_key_here"
   ```
3. Run database migrations:
   ```bash
   dotnet ef database update
   ```
4. Start the API:
   ```bash
   dotnet run
   ```

### Frontend

```bash
npm install
npm run dev
```

---

## 🔮 Future Enhancements

- Video streaming support
- Course progress analytics
- Student performance dashboards
- AI-generated explanations
- Multi-language support
- Email notifications
- Payment integration

---

## 👨‍🎓 Academic Context

This project was developed as part of an academic software engineering curriculum and demonstrates:
- Full-stack development
- Secure system design
- AI integration
- Database modeling
- Clean architecture principles
- Real-world problem solving

---

## ✍️ Author

**Mahmoud Faour**  
Computer & Communication Engineering  
Software Engineering Track

---

## 📜 License

This project is for educational purposes only.

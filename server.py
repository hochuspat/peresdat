from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import mysql.connector
from mysql.connector import Error
import datetime
from fastapi.middleware.cors import CORSMiddleware  # Импортируйте CORSMiddleware

app = FastAPI()

# Подключите middleware для обработки CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Замените на адрес вашего фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Класс модели для ответа
class Lesson(BaseModel):
    id: int
    date: datetime.date
    room: str
    time: str
    subject: str
    group_number: int
    subgroup: str

# Маршрут для получения занятий
# Маршрут для получения занятий только по дате
@app.get("/lessons/{date}", response_model=list[Lesson])
async def get_lessons(date: str):
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='school_schedule',
            user='root',
            password='12345'
        )

        # Обновлённый SQL запрос, который ожидает только один параметр - date
        query = "SELECT * FROM lessons WHERE date = %s"
        cursor = connection.cursor()
        cursor.execute(query, (date,))  # Обратите внимание на запятую после date, она создаёт кортеж из одного элемента
        result = cursor.fetchall()
        lessons = [Lesson(id=row[0], date=row[1], room=row[2], time=row[3], subject=row[4], group_number=row[5], subgroup=row[6]) for row in result]
        return lessons

    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection and connection.is_connected():
            connection.close()

# Для запуска используйте команду: uvicorn имя_файла:app --reload
# Маршрут для добавления нового занятия, если группа свободна
class CreateLesson(BaseModel):
    date: datetime.date
    room: str
    time: str
    subject: str
    group_number: int
    subgroup: str

@app.post("/book-lesson", response_model=Lesson)
async def book_lesson(lesson: CreateLesson):
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='school_schedule',
            user='root',
            password='12345'
        )

        # Проверяем, есть ли у группы занятие в это же время
        check_query = """
        SELECT * FROM lessons
        WHERE date = %s AND time = %s AND group_number = %s AND 
        (subgroup = %s OR subgroup = 'Вся группа')
        """
        cursor = connection.cursor()
        cursor.execute(check_query, (lesson.date, lesson.time, lesson.group_number, lesson.subgroup))
        existing_lessons = cursor.fetchall()

        # Проверяем, есть ли занятие для всей группы в это время
        check_whole_group_query = """
        SELECT * FROM lessons
        WHERE date = %s AND time = %s AND group_number = %s AND subgroup = 'Вся группа'
        """
        cursor.execute(check_whole_group_query, (lesson.date, lesson.time, lesson.group_number))
        whole_group_lessons = cursor.fetchall()

        if existing_lessons or whole_group_lessons:
            raise HTTPException(status_code=400, detail="Группа или подгруппа уже занята в это время")

        # Если проверки пройдены, добавляем новое занятие
        add_query = """
        INSERT INTO lessons (date, room, time, subject, group_number, subgroup)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(add_query, (lesson.date, lesson.room, lesson.time, lesson.subject, lesson.group_number, lesson.subgroup))
        connection.commit()

        # Возвращаем добавленное занятие как подтверждение
        new_lesson_id = cursor.lastrowid
        return {**lesson.dict(), "id": new_lesson_id}

    except Error as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
# Модель Pydantic для данных пользователя
class User(BaseModel):
    username: str

# Маршрут для записи логина пользователя
@app.post('/record-login')
async def record_login(user: User):  # Используйте модель Pydantic для валидации входящих данных
    try:
        # Подключение к базе данных
        connection = mysql.connector.connect(
            host='localhost',
            database='school_schedule',
            user='root',
            password='12345'
        )
        cursor = connection.cursor()
        # Запрос на вставку логина пользователя
        query = "INSERT INTO user_logins (username) VALUES (%s)"
        cursor.execute(query, (user.username,))
        connection.commit()  # Фиксация транзакции
        return {"message": "Login recorded successfully"}

    except Error as e:
        # Если произошла ошибка, откатить транзакцию и вернуть ошибку через HTTPException
        connection.rollback() if connection.is_connected() else None
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Закрыть соединение с базой данных
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
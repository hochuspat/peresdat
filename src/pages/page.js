// Добавляем директиву use client
'use client'

// Импортируем React и Next.js
import React, { useState } from 'react'
import { useRouter } from 'next/router'

// Импортируем компоненты календаря и формы
import Calendar from '../src/components/Calendar.js'
import Form from '../src/components/Form.js'

// Создаем страницу с календарем
export default function CalendarPage() {
  // Получаем текущую дату
  const today = new Date()

  // Создаем состояние для выбранной даты, аудитории и времени
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)

  // Создаем состояние для отображения формы
  const [showForm, setShowForm] = useState(false)

  // Создаем состояние для хранения занятий
  const [lessons, setLessons] = useState([])

  // Создаем функцию для обработки выбора даты
  const handleDateChange = (date) => {
    // Устанавливаем выбранную дату
    setSelectedDate(date)
    // Сбрасываем выбранную аудиторию и время
    setSelectedRoom(null)
    setSelectedTime(null)
    // Скрываем форму
    setShowForm(false)
  }

  // Создаем функцию для обработки выбора аудитории и времени
  const handleRoomTimeChange = (room, time) => {
    // Проверяем, есть ли уже занятие в эту дату, аудиторию и время
    const existingLesson = lessons.find(
      (lesson) =>
        lesson.date.toDateString() === selectedDate.toDateString() &&
        lesson.room === room &&
        lesson.time === time
    )
    // Если есть, то ничего не делаем
    if (existingLesson) {
      return
    }
    // Если нет, то устанавливаем выбранную аудиторию и время
    setSelectedRoom(room)
    setSelectedTime(time)
    // Отображаем форму
    setShowForm(true)
  }

  // Создаем функцию для обработки отправки формы
  const handleSubmit = (data) => {
    // Добавляем новое занятие в список занятий
    setLessons([
      ...lessons,
      {
        date: selectedDate,
        room: selectedRoom,
        time: selectedTime,
        ...data,
      },
    ])
    // Сбрасываем выбранную аудиторию и время
    setSelectedRoom(null)
    setSelectedTime(null)
    // Скрываем форму
    setShowForm(false)
  }

  // Создаем функцию для обработки отмены формы
  const handleCancel = () => {
    // Сбрасываем выбранную аудиторию и время
    setSelectedRoom(null)
    setSelectedTime(null)
    // Скрываем форму
    setShowForm(false)
  }

  // Возвращаем JSX разметку страницы
  return (
    <div className="container">
      <h1>Календарь занятий</h1>
      <div className="calendar">
        <Calendar
          date={selectedDate}
          onDateChange={handleDateChange}
          lessons={lessons}
          onRoomTimeChange={handleRoomTimeChange}
        />
      </div>
      {showForm && (
        <div className="form">
          <Form
            date={selectedDate}
            room={selectedRoom}
            time={selectedTime}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      )}
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .calendar {
          margin-top: 20px;
        }
        .form {
          margin-top: 20px;
        }
      `}</style>
    </div>
  )
}

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Select } from 'antd';
import { Calendar } from 'antd';
import { notification } from 'antd';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/lib/locale/ru_RU';
import 'moment/locale/ru'; // Импорт русской локали
import moment from 'moment';
import styles from './MyCalendar.module.css'; 
moment.locale('ru'); 
const getLessons = async (date) => {
  try {
    const url = `http://127.0.0.1:8000/lessons/${date}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Ошибка при получении занятий:", error);
    return []; // Возвращаем пустой массив в случае ошибки
  }
};

const bookLesson = async (lessonData) => {
  try {
    const response = await fetch('http://127.0.0.1:8000/book-lesson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: lessonData.date,
        room: lessonData.room,
        time: lessonData.time,
        subject: lessonData.predmet, // Предполагаем, что на сервере это поле называется `subject`
        group_number: parseInt(lessonData.group), // Убедитесь, что это число
        subgroup: lessonData.subgroup === "whole" ? "Вся группа" : lessonData.subgroup, // Отправьте 'Вся группа', если выбрано 'whole'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Неизвестная ошибка сервера');
    }

    return await response.json(); // Возвращаем данные нового занятия
  } catch (error) {
    console.error("Ошибка при бронировании занятия:", error);
    throw error; // Пробрасываем ошибку дальше
  }
};


// Функция для проверки, свободна ли аудитория в определенное время
const isRoomFree = async (date, room, time) => {
  try {
    const lessons = await getLessons(date, room);
    if (Array.isArray(lessons)) {
      return !lessons.some((lesson) => lesson.time === time);
    } else {
      console.error('Список занятий не является массивом:', lessons);
      return false;
    }
  } catch (error) {
    console.error("Ошибка при получении занятий:", error);
    return false;
  }
};





// Функция для добавления нового занятия в базу данных
const addLesson = (lesson) => {
  // Здесь можно использовать API для отправки данных в базу
  alert('Добавлено новое занятие:', lesson);
  console.log('Добавлено новое занятие:', lesson);
};

const { Option } = Select;

const BookingForm = ({ selectedSlot, handleFormSubmit, handleCancel, initialLesson }) => {
  const [form] = Form.useForm(); 

// Функция для вызова при нажатии на кнопку "Забронировать"
const onFormSubmit = () => {
  form.validateFields().then(async (values) => {
    try {
      const newLesson = await bookLesson({
        ...values,
        date: selectedSlot.date,
        room: selectedSlot.room,
        time: selectedSlot.time,
      });
      console.log('Занятие успешно добавлено:', newLesson);
      // Показываем уведомление об успешном добавлении
      notification.success({
        message: 'Занятие добавлено',
        description: 'Занятие успешно добавлено в расписание.'
      });
      handleCancel(); // Вызываем функцию закрытия модального окна
    } catch (error) {
      // Обработка ошибки, если сервер сообщает о конфликте
      notification.error({
        message: 'Ошибка добавления занятия',
        description: error.message || 'Не удалось добавить занятие.'
      });
    }
  }).catch((info) => {
    console.log('Validate Failed:', info);
  });
};



return (
  <Modal
    title={`${initialLesson ? 'Редактировать' : 'Забронировать'} аудиторию`}
    open={!!selectedSlot}
    onCancel={handleCancel}
    footer={[
      <Button key="submit" type="primary" onClick={onFormSubmit}>
        Забронировать
      </Button>,
    ]}
  >
    <Form
      form={form}
      layout="vertical"
      initialValues={initialLesson || {
        date: selectedSlot?.date,
        room: selectedSlot?.room,
        time: selectedSlot?.time,
      }}
    >
      <Form.Item name="date" label="Дата">
          <Input readOnly />
        </Form.Item>
        <Form.Item name="room" label="Аудитория">
          <Input readOnly />
        </Form.Item>
        <Form.Item name="time" label="Время">
          <Input readOnly />
        </Form.Item>
    <Form.Item
        name="predmet"
        label="Предмет"
        rules={[{ required: true, message: 'Пожалуйста, выберите предмет' }]}
      >
        <Select placeholder="Выберите предмет">
          <Option value="Микроэкомика">Микроэкомика</Option>
          <Option value="Основы проектной деятельности">Основы проектной деятельности</Option>
          {/* ... другие номера групп ... */}
          <Option value="Курсовая">Курсовая</Option>
        </Select>
      </Form.Item>      
      <Form.Item
        name="group"
        label="Группа"
        rules={[{ required: true, message: 'Пожалуйста, выберите номер группы' }]}
      >
        <Select placeholder="Выберите группу">
          <Option value="101">101</Option>
          <Option value="102">102</Option>
          {/* ... другие номера групп ... */}
          <Option value="501">501</Option>
        </Select>
      </Form.Item>
      <Form.Item
        name="subgroup"
        label="Подгруппа"
        rules={[{ required: true, message: 'Пожалуйста, выберите подгруппу' }]}
      >
        <Select placeholder="Выберите подгруппу">
          <Option value="1">1</Option>
          <Option value="2">2</Option>
          <Option value="whole">Вся группа</Option>
        </Select>
      </Form.Item>
      {/* ... другие поля формы ... */}
    </Form>
  </Modal>
);
};

const ScheduleGrid = ({ rooms, times, selectedDate, lessons, onSlotClick, onCellClick }) => {
  const formattedDate = selectedDate.format('YYYY-MM-DD');    
  const [freeSlots, setFreeSlots] = useState({});
  
    useEffect(() => {
      const checkFreeSlots = async () => {
        const slots = {};
        for (let room of rooms) {
          for (let time of times) {
            slots[`${room}-${time}`] = await isRoomFree(selectedDate.format('YYYY-MM-DD'), room, time);
          }
        }
        setFreeSlots(slots);
      };
      checkFreeSlots();
    }, [rooms, times, selectedDate]);
  
    const isBooked = (room, time) => {
      return lessons.some((lesson) =>
        lesson.date === formattedDate && lesson.room === room && lesson.time === time);
    };
    const handleCellClick = (date, room, time) => {
      const booked = isBooked(room, time);
      if (booked) {
        // Если слот занят, находим детали занятия и вызываем onCellClick для открытия модального окна с деталями занятия
        const lessonDetails = lessons.find(lesson => 
          lesson.date === date && lesson.room === room && lesson.time === time);
        
        if (lessonDetails) {
          onCellClick(lessonDetails);
        }
      } else {
        // Если слот свободен, вызываем onSlotClick для открытия модального окна с формой бронирования
        onSlotClick({ date, room, time });
      }
    };
    

  // Теперь используйте formattedDate внутри map
  return (
    <div className={styles.scheduleGrid}>
      <div className={styles.gridHeader}>
        <div className={styles.gridCell}>Время\Аудитория</div>
        {rooms.map((room) => (
          <div key={room} className={styles.gridCell}>{room}</div>
        ))}
      </div>
      {times.map((time) => (
        <React.Fragment key={time}>
          <div className={styles.gridCell}>{time}</div>
          {rooms.map((room) => {
        const booked = isBooked(room, time);
        const cellClass = booked ? styles.booked : styles.free;
        const cellText = booked ? "Занято" : "Свободно";

            return (
              <div
                key={room}
                className={cellClass}
                onClick={() => handleCellClick(formattedDate, room, time)}
              >
                {cellText}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};
const LessonDetailsModal = ({ lesson, open, onClose }) => {
  if (!lesson) {
    return null; // or some other placeholder content
  }

  return (
    <Modal
      title="Детали занятия"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          Закрыть
        </Button>,
      ]}
    >
      <p>Дата: {lesson.date}</p>
      <p>Аудитория: {lesson.room}</p>
      <p>Время: {lesson.time}</p>
      <p>Предмет: {lesson.subject}</p>
      <p>Группа: {lesson.group_number}</p>
      <p>Подгруппа: {lesson.subgroup}</p>
    </Modal>
  );
};

const MyCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(moment());   
  const [selectedLessonDetails, setSelectedLessonDetails] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form] = Form.useForm();
  const [bookedSlots, setBookedSlots] = useState([]);
  const handleModalCancel = () => {
    setSelectedDate(null);
    setSelectedRoom(null);
    setSelectedTime(null);
    setModalVisible(false);
    form.resetFields();
  };
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const handleDateSelect = (value) => {
    setSelectedDate(value);
    setModalVisible(true);
  };
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);


  const [lessons, setLessons] = useState([]);
  const [editingLesson, setEditingLesson] = useState(null);
  

  
  const [dailyLessons, setDailyLessons] = useState([]);

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = selectedDate.format('YYYY-MM-DD');
      getLessons(formattedDate)
        .then((lessons) => {
          console.log('Занятия на дату', formattedDate, lessons);
          setDailyLessons(lessons);
        })
        .catch((error) => {
          console.error('Ошибка при получении занятий:', error);
          setDailyLessons([]);
        });
    }
  }, [selectedDate]);
  
  
  const [lessonsData, setLessonsData] = useState({});

  useEffect(() => {
    // Example of defining dates to fetch
    // This needs to be replaced with your actual logic to determine dates
    const datesToFetch = ['2023-11-01', '2023-11-02', '2023-11-03']; // Example dates
  
    datesToFetch.forEach(date => {
      getLessons(date)
        .then(lessons => {
          setLessonsData(prevData => ({ ...prevData, [date]: lessons }));
        })
        .catch(error => {
          console.error('Error fetching lessons:', error);
          setLessonsData(prevData => ({ ...prevData, [date]: [] }));
        });
    });
  }, []);
  
  const dateCellRender = (value) => {
    const dateKey = value.format('YYYY-MM-DD');
    const lessons = lessonsData[dateKey] || [];

    return (
      <ul className="events">
        {lessons.map((lesson) => (
          <li key={lesson.time + lesson.room}>
            <Badge status="success" text={`${lesson.time} ${lesson.room} ${lesson.subject} ${lesson.group}${lesson.subgroup}`} />
          </li>
        ))}
      </ul>
    );
  };
  // Функция для закрытия модального окна с информацией о занятии
  const closeLessonModal = () => {
    setLessonModalVisible(false);
    setSelectedLesson(null);
  };


 
  

  // Функция для обработки отправки формы
  const handleFormSubmit = (lesson, slot) => {
    // Если редактируется урок, обновите его
    if (editingLesson) {
      // Обновляем состояние уроков
    } else {
      // Добавляем новый урок и обновляем список забронированных слотов
      setBookedSlots([...bookedSlots, { ...slot, subject: lesson.subject }]);
    }

    setBookingModalVisible(false);
    setSelectedSlot(null);
    setEditingLesson(null);
  };

  // Функция для отмены формы
  const handleCancel = () => {
    setBookingModalVisible(false);
    setSelectedSlot(null);
    setEditingLesson(null);
  };


  const [scheduleModalVisible, setScheduleModalVisible] = useState(true); // Изменено здесь
  // Список аудиторий
  const rooms = ['201Н', '202Н', '203Н', '204Н', '205Н','206Н', '207Н', '208Н', '209Н', '210Н'];
  // Список временных интервалов
  const times = ['8:00-9:30', '9:40-10:50', '11:00-12:10', '12:20-13:30', '14:10-15:30'];
  const onCellClick = (lessonDetails) => {
    setSelectedLessonDetails(lessonDetails);
    setLessonModalVisible(true);
  };
  
  const isBooked = (room, time) => {
    return lessons.some((lesson) =>
      lesson.date === selectedDate.format('YYYY-MM-DD') && lesson.room === room && lesson.time === time);
  };
  
  // Modify handleSlotClick in MyCalendar to handle different cases
  const handleSlotClick = (slot) => {
    const booked = isBooked(slot.room, slot.time);
  
    if (booked) {
      const lessonDetails = lessons.find(lesson => 
        lesson.date === slot.date && lesson.room === slot.room && lesson.time === slot.time);
      setSelectedLessonDetails(lessonDetails);
      setLessonModalVisible(true);
    } else {
      setSelectedSlot(slot);
      setBookingModalVisible(true);
    }
  };
  
  
// В MyCalendar, добавьте следующее:
const handleLessonDetails = (lessonDetails) => {
  setSelectedLesson(lessonDetails);
  setLessonModalVisible(true);
};

return (
  <ConfigProvider locale={ruRU}>
    <div className={styles.myCalendar}>
      {/* Удалите или закомментируйте следующий блок кода */}
      {/* <Calendar
        fullscreen={true}
        onSelect={handleDateSelect}
        cellRender={dateCellRender}
      /> */}
      
      {/* Обновленное модальное окно с расписанием */}
      <Modal
        title={`Расписание на ${selectedDate ? selectedDate.format('DD.MM.YYYY') : ''}`}
        open={scheduleModalVisible} // Используйте обновленное состояние здесь
        onCancel={() => setScheduleModalVisible(false)}
        footer={null}
        width="80%"
      >
    <ScheduleGrid
      rooms={rooms}
      times={times}
      selectedDate={selectedDate}
      lessons={dailyLessons} // передаем занятия как пропс
      bookedSlots={bookedSlots} // Передаем bookedSlots в ScheduleGrid
      onSlotClick={handleSlotClick}
      onCellClick={onCellClick}
/>

{lessonModalVisible && selectedLessonDetails && (
  <LessonDetailsModal
    lesson={selectedLessonDetails}
    open={lessonModalVisible}
    onClose={() => setLessonModalVisible(false)}
  />
)}


<BookingForm
  selectedSlot={selectedSlot || editingLesson}
  handleFormSubmit={handleFormSubmit}
  handleCancel={handleCancel}
  initialLesson={editingLesson}
  open={bookingModalVisible} // Updated from visible to open
/>
</Modal>
      </div>
    </ConfigProvider>
  );
};

export default MyCalendar;

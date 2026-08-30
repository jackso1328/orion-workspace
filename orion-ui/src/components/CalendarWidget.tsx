import { useState } from "react";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO 
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";

interface CalendarWidgetProps {
  selectedDate: Date;
  onDateClick: (date: Date) => void;
}

export default function CalendarWidget({ selectedDate, onDateClick }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const tasks = useOrionStore((state) => state.tasks);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button onClick={prevMonth} className="cal-btn"><ChevronLeft size={18} /></button>
        <span className="cal-month">{format(currentDate, "MMMM yyyy")}</span>
        <button onClick={nextMonth} className="cal-btn"><ChevronRight size={18} /></button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateFormat = "E";
    let startDate = startOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="cal-day-name" key={i}>
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }
    return <div className="cal-days-row">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Find tasks for this specific day
        const dayTasks = tasks.filter(t => {
          if (!t.dueDate) return false;
          return isSameDay(parseISO(t.dueDate), cloneDay);
        });

        days.push(
          <div
            className={`cal-cell ${!isSameMonth(day, monthStart)
              ? "disabled"
              : isSameDay(day, selectedDate) ? "selected" : ""
            }`}
            key={day.toString()}
            onClick={() => onDateClick(cloneDay)}
          >
            <span className="cal-number">{formattedDate}</span>
            {dayTasks.length > 0 && (
              <div className="cal-dots">
                {dayTasks.slice(0, 3).map((t, idx) => (
                  <span key={idx} className="cal-dot" style={{ backgroundColor: t.color }}></span>
                ))}
                {dayTasks.length > 3 && <span className="cal-dot-more">+</span>}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="cal-row" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="cal-body">{rows}</div>;
  };

  return (
    <div className="calendar-widget">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}

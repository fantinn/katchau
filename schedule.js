// ── Schedule View ─────────────────────────────────
const Schedule = (() => {
  const STORAGE_KEY = 'finara_schedule';
  const START_DATE_KEY = 'finara_schedule_start';

  const hours = [
    '6', '07:30', '08:30', '09:30', '10:30', '11:30',
    '12:30', '13:30', '14:30', '15:30', '16:30', '17:30',
    '18', '19', '20', '21', '22', '23'
  ];

  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const getSchedule = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  };

  const saveSchedule = (schedule) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  };

  const getStartDate = () => {
    try {
      const date = localStorage.getItem(START_DATE_KEY);
      return date ? new Date(date) : new Date();
    } catch {
      return new Date();
    }
  };

  const saveStartDate = (date) => {
    localStorage.setItem(START_DATE_KEY, date.toISOString());
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getWeekDates = (startDate) => {
    const dates = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getCellKey = (dayIndex, hour) => {
    return `${dayIndex}_${hour}`;
  };

  const render = (container) => {
    const startDate = getStartDate();
    const weekDates = getWeekDates(startDate);
    const schedule = getSchedule();

    let html = `
      <div class="schedule-container">
        <div class="schedule-header">
          <h2>Programação Semanal</h2>
          <div class="schedule-controls">
            <button class="btn btn-secondary" onclick="Schedule.prevWeek()">← Semana anterior</button>
            <button class="btn btn-secondary" onclick="Schedule.nextWeek()">Próxima semana →</button>
            <button class="btn btn-primary" onclick="Schedule.resetToToday()">Hoje</button>
          </div>
        </div>
        <div class="schedule-week-info">
          ${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}
        </div>
        <div class="schedule-grid">
          <div class="schedule-corner"></div>
    `;

    // Render day headers
    weekDates.forEach((date, i) => {
      html += `
        <div class="schedule-day-header">
          <div class="schedule-day-name">${days[i].toUpperCase()}</div>
          <div class="schedule-date">${formatDate(date)}</div>
        </div>
      `;
    });

    // Render rows
    hours.forEach(hour => {
      html += `<div class="schedule-time">${hour}</div>`;
      
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const key = getCellKey(dayIndex, hour);
        const task = schedule[key] || '';
        html += `
          <div class="schedule-cell" contenteditable="true" 
               data-day="${dayIndex}" data-hour="${hour}"
               onblur="Schedule.saveCell(this)">${task}</div>
        `;
      }
    });

    html += `</div></div>`;
    container.innerHTML = html;
  };

  const saveCell = (cell) => {
    const dayIndex = cell.dataset.day;
    const hour = cell.dataset.hour;
    const key = getCellKey(dayIndex, hour);
    const schedule = getSchedule();
    
    if (cell.textContent.trim()) {
      schedule[key] = cell.textContent.trim();
    } else {
      delete schedule[key];
    }
    
    saveSchedule(schedule);
  };

  const prevWeek = () => {
    const startDate = getStartDate();
    startDate.setDate(startDate.getDate() - 7);
    saveStartDate(startDate);
    init(document.getElementById('view-schedule'));
  };

  const nextWeek = () => {
    const startDate = getStartDate();
    startDate.setDate(startDate.getDate() + 7);
    saveStartDate(startDate);
    init(document.getElementById('view-schedule'));
  };

  const resetToToday = () => {
    saveStartDate(new Date());
    init(document.getElementById('view-schedule'));
  };

  const init = (container) => {
    render(container);
  };

  return { init, saveCell, prevWeek, nextWeek, resetToToday };
})();

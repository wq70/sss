// ==================== 时间感知与自定义时间系统 ====================
(function() {
  'use strict';

  // 获取元素
  const timePerceptionToggle = document.getElementById('time-perception-toggle');
  const timeZoneGroup = document.getElementById('time-zone-group');
  const customTimeToggle = document.getElementById('custom-time-toggle');
  const customTimeSettingsGroup = document.getElementById('custom-time-settings-group');
  
  const customYearInput = document.getElementById('custom-year-input');
  const customMonthInput = document.getElementById('custom-month-input');
  const customDayInput = document.getElementById('custom-day-input');
  const customHourInput = document.getElementById('custom-hour-input');
  const customMinuteInput = document.getElementById('custom-minute-input');
  const customTimePreview = document.getElementById('custom-time-preview');

  // 从localStorage加载设置
  function loadSettings() {
    const timePerceptionEnabled = localStorage.getItem('time-perception-enabled') === 'true';
    const customTimeEnabled = localStorage.getItem('custom-time-enabled') === 'true';
    
    timePerceptionToggle.checked = timePerceptionEnabled;
    customTimeToggle.checked = customTimeEnabled;
    
    // 显示/隐藏相应的设置面板
    if (timePerceptionEnabled) {
      timeZoneGroup.style.display = 'block';
    }
    if (customTimeEnabled) {
      customTimeSettingsGroup.style.display = 'block';
    }
    
    // 加载自定义时间值
    customYearInput.value = localStorage.getItem('custom-time-year') || '';
    customMonthInput.value = localStorage.getItem('custom-time-month') || '';
    customDayInput.value = localStorage.getItem('custom-time-day') || '';
    customHourInput.value = localStorage.getItem('custom-time-hour') || '';
    customMinuteInput.value = localStorage.getItem('custom-time-minute') || '';
    
    updatePreview();
  }

  // 更新时间预览
  function updatePreview() {
    const year = customYearInput.value;
    const month = customMonthInput.value;
    const day = customDayInput.value;
    const hour = customHourInput.value;
    const minute = customMinuteInput.value;
    
    if (year && month && day && hour !== '' && minute !== '') {
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const hourStr = String(hour).padStart(2, '0');
      const minuteStr = String(minute).padStart(2, '0');
      customTimePreview.textContent = `${year}年${monthStr}月${dayStr}日 ${hourStr}:${minuteStr}`;
    } else {
      customTimePreview.textContent = '未设置';
    }
  }

  // 保存自定义时间设置
  function saveCustomTimeSettings() {
    localStorage.setItem('custom-time-year', customYearInput.value);
    localStorage.setItem('custom-time-month', customMonthInput.value);
    localStorage.setItem('custom-time-day', customDayInput.value);
    localStorage.setItem('custom-time-hour', customHourInput.value);
    localStorage.setItem('custom-time-minute', customMinuteInput.value);
    updatePreview();
  }

  // 时间感知开关事件
  timePerceptionToggle.addEventListener('change', function() {
    const isEnabled = this.checked;
    localStorage.setItem('time-perception-enabled', isEnabled);
    
    if (isEnabled) {
      // 显示时区设置
      timeZoneGroup.style.display = 'block';
      
      // 关闭自定义时间
      if (customTimeToggle.checked) {
        customTimeToggle.checked = false;
        customTimeSettingsGroup.style.display = 'none';
        localStorage.setItem('custom-time-enabled', 'false');
      }
    } else {
      timeZoneGroup.style.display = 'none';
    }
  });

  // 自定义时间开关事件
  customTimeToggle.addEventListener('change', function() {
    const isEnabled = this.checked;
    localStorage.setItem('custom-time-enabled', isEnabled);
    
    if (isEnabled) {
      // 显示自定义时间设置
      customTimeSettingsGroup.style.display = 'block';
      
      // 关闭时间感知
      if (timePerceptionToggle.checked) {
        timePerceptionToggle.checked = false;
        timeZoneGroup.style.display = 'none';
        localStorage.setItem('time-perception-enabled', 'false');
      }
      
      // 如果没有设置值，使用当前时间作为默认值
      if (!customYearInput.value) {
        const now = new Date();
        customYearInput.value = now.getFullYear();
        customMonthInput.value = now.getMonth() + 1;
        customDayInput.value = now.getDate();
        customHourInput.value = now.getHours();
        customMinuteInput.value = now.getMinutes();
        saveCustomTimeSettings();
      }
    } else {
      customTimeSettingsGroup.style.display = 'none';
    }
  });

  // 监听自定义时间输入变化
  [customYearInput, customMonthInput, customDayInput, customHourInput, customMinuteInput].forEach(input => {
    input.addEventListener('input', saveCustomTimeSettings);
    input.addEventListener('change', saveCustomTimeSettings);
  });

  // 获取当前时间（考虑自定义时间）
  window.getCustomTime = function() {
    const customTimeEnabled = localStorage.getItem('custom-time-enabled') === 'true';
    
    if (customTimeEnabled) {
      const year = localStorage.getItem('custom-time-year');
      const month = localStorage.getItem('custom-time-month');
      const day = localStorage.getItem('custom-time-day');
      const hour = localStorage.getItem('custom-time-hour');
      const minute = localStorage.getItem('custom-time-minute');
      
      if (year && month && day && hour !== null && minute !== null) {
        return {
          enabled: true,
          year: parseInt(year),
          month: parseInt(month),
          day: parseInt(day),
          hour: parseInt(hour),
          minute: parseInt(minute),
          formatted: `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        };
      }
    }
    
    // 返回当前实际时间
    const now = new Date();
    return {
      enabled: false,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      formatted: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    };
  };

  // 页面加载时初始化
  loadSettings();

  console.log('时间感知与自定义时间系统已初始化');
})();

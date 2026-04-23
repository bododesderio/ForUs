export const convertToLocalDate = (appointmentDate) => {
    if (!appointmentDate) return 'Invalid Date';
    
    let localDate;
    
    if (appointmentDate.includes('T')) {
        // If the date includes 'T', it's in ISO format
        const utcDate = new Date(appointmentDate);
        localDate = utcDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    } else {
        // If it's just a date string like '2024-01-15'
        const dateOnly = appointmentDate.split('T')[0];
        const date = new Date(dateOnly + 'T00:00:00'); // Add time to avoid timezone issues
        localDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    return localDate;
};

export const formatTime = (timeString) => {
    if (!timeString) return 'Invalid Time';
    try {
        let hours, minutes;
        // If input is an ISO string, extract time
        if (timeString.includes('T')) {
            const date = new Date(timeString);
            hours = date.getHours();
            minutes = date.getMinutes();
        } else {
            // Extract just the time part (HH:MM) if it includes seconds
            const timePart = timeString.substring(0, 5);
            [hours, minutes] = timePart.split(':').map(Number);
        }
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return timeString; // Return original if parsing fails
    }
};

// Function to get local date in YYYY-MM-DD format (similar to your reference function)
export const getLocalDateString = (appointmentDate) => {
    if (!appointmentDate) return null;
    
    let localDate;
    
    if (appointmentDate.includes('T')) {
        const utcDate = new Date(appointmentDate);
        const year = utcDate.getFullYear();
        const month = (utcDate.getMonth() + 1).toString().padStart(2, '0');
        const day = utcDate.getDate().toString().padStart(2, '0');
        localDate = `${year}-${month}-${day}`;
    } else {
        localDate = appointmentDate.split('T')[0];
    }
    
    return localDate;
};

export function toLocalDateTimeString(utcISOString) {
  if (!utcISOString) return '';
  const date = new Date(utcISOString);
  if (isNaN(date.getTime())) return '';
  // Format: e.g. 'Jun 23, 2025, 2:30 PM'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
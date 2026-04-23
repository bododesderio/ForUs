type generateTimeSlotsProps = {
    startTime: string;
    endTime: string;
    intervalMinutes: number;
}

export default function generateTimeSlots(startTime, endTime, intervalMinutes = 30) {
    const slots = [];
    
    // Parse the start and end times
    const start = new Date(`1970-01-01T${convertTo24Hour(startTime)}`);
    const end = new Date(`1970-01-01T${convertTo24Hour(endTime)}`);
    
    let current = new Date(start);
    
    while (current < end) {
        slots.push({
            time: formatTo12Hour(current),
            isAvailable: true,
            isSelected: false
        });
        
        // Add interval minutes
        current.setMinutes(current.getMinutes() + intervalMinutes);
    }
    
    return slots;
}

// Helper function to convert 12-hour to 24-hour format
function convertTo24Hour(time12h) {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
        hours = '00';
    }
    
    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }
    
    return `${hours}:${minutes}:00`;
}

// Helper function to format time to 12-hour format
function formatTo12Hour(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Usage example
const dbStartTime = "12:00 PM";
const dbEndTime = "6:00 PM";
const timeSlots = generateTimeSlots(dbStartTime, dbEndTime, 30);
// AppointmentTimeManager.js - Fixed version with error handling and missing methods
class AppointmentTimeManager {
    constructor() {
        // Kampala timezone (UTC+3)
        this.KAMPALA_TIMEZONE_OFFSET = 3; // hours ahead of UTC
        this.KAMPALA_TIMEZONE = 'Africa/Kampala';
    }

    /**
     * Get current time in Kampala timezone
     */
    getCurrentLocalTime() {
        const now = new Date();
        // Create a proper Kampala time using Intl.DateTimeFormat
        const kampalaTime = new Intl.DateTimeFormat('en-CA', {
            timeZone: this.KAMPALA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(now);

        const dateStr = `${kampalaTime.find(p => p.type === 'year').value}-${kampalaTime.find(p => p.type === 'month').value}-${kampalaTime.find(p => p.type === 'day').value}`;
        const timeStr = `${kampalaTime.find(p => p.type === 'hour').value}:${kampalaTime.find(p => p.type === 'minute').value}:${kampalaTime.find(p => p.type === 'second').value}`;
        
        return `${dateStr} ${timeStr}`;
    }

    /**
     * Convert 12-hour format to 24-hour format
     */
    convertTo24Hour(time12h) {
        if (!time12h || typeof time12h !== 'string') {
            console.error('Invalid time12h input:', time12h);
            return null;
        }

        try {
            const [time, modifier] = time12h.trim().split(' ');
            if (!time || !modifier) {
                throw new Error('Invalid time format - missing time or AM/PM');
            }

            let [hours, minutes] = time.split(':');
            if (!hours || !minutes) {
                throw new Error('Invalid time format - missing hours or minutes');
            }
            
            hours = parseInt(hours, 10);
            minutes = parseInt(minutes, 10);

            if (isNaN(hours) || isNaN(minutes)) {
                throw new Error('Invalid time format - non-numeric values');
            }
            
            if (hours === 12 && modifier.toUpperCase() === 'AM') {
                hours = 0;
            } else if (hours !== 12 && modifier.toUpperCase() === 'PM') {
                hours = hours + 12;
            }
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        } catch (error) {
            console.error('Error converting to 24-hour format:', error.message);
            return null;
        }
    }

    /**
     * Convert UTC datetime to Kampala local time
     */
    convertUTCToLocal(utcDateTimeString) {
        if (!utcDateTimeString) {
            console.error('Invalid UTC datetime string:', utcDateTimeString);
            return null;
        }

        try {
            const utcDate = new Date(utcDateTimeString);
            
            if (isNaN(utcDate.getTime())) {
                throw new Error('Invalid date string');
            }
            
            // Use Intl.DateTimeFormat for proper timezone conversion
            const localParts = new Intl.DateTimeFormat('en-CA', {
                timeZone: this.KAMPALA_TIMEZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).formatToParts(utcDate);

            const dateStr = `${localParts.find(p => p.type === 'year').value}-${localParts.find(p => p.type === 'month').value}-${localParts.find(p => p.type === 'day').value}`;
            const timeStr = `${localParts.find(p => p.type === 'hour').value}:${localParts.find(p => p.type === 'minute').value}:${localParts.find(p => p.type === 'second').value}`;
            
            return `${dateStr} ${timeStr}`;
        } catch (error) {
            console.error('Error converting UTC to local:', error.message);
            return null;
        }
    }

    /**
     * Convert local Kampala time to UTC for database storage
     */
    convertLocalToUTC(localDateString, localTimeString) {
        if (!localDateString || !localTimeString) {
            console.error('Invalid local date/time:', { localDateString, localTimeString });
            return null;
        }

        try {
            // Create a date object representing the local time in Kampala
            const localDateTimeString = `${localDateString}T${localTimeString}`;
            
            // Parse as if it's in Kampala timezone
            const tempDate = new Date(localDateTimeString);
            
            if (isNaN(tempDate.getTime())) {
                throw new Error('Invalid local date/time combination');
            }
            
            // Create the actual UTC time by treating the input as Kampala time
            // We need to subtract the offset to get UTC
            const utcDate = new Date(tempDate.getTime() - (this.KAMPALA_TIMEZONE_OFFSET * 60 * 60 * 1000));
            
            return utcDate.toISOString();
        } catch (error) {
            console.error('Error converting local to UTC:', error.message);
            return null;
        }
    }

    /**
     * Parse appointment datetime stored in database
     */
    parseAppointmentDateTime(appointmentDate, appointmentTime) {
        if (!appointmentDate || !appointmentTime) {
            console.error('Invalid appointment date/time:', { appointmentDate, appointmentTime });
            return null;
        }

        try {
            // The database stores local Kampala time
            const localDateTime = `${appointmentDate} ${appointmentTime}`;
            
            // Convert to proper local time display
            const displayTime = this.convertTo12Hour(appointmentTime);
            
            return {
                localDateTime,
                displayDate: appointmentDate,
                displayTime: displayTime || appointmentTime // fallback to 24-hour if conversion fails
            };
        } catch (error) {
            console.error('Error parsing appointment datetime:', error.message);
            return null;
        }
    }

    /**
     * Convert 24-hour format to 12-hour format for display
     */
    convertTo12Hour(time24h) {
        if (!time24h || typeof time24h !== 'string') {
            console.error('Invalid time24h input:', time24h);
            return null;
        }

        try {
            const timeParts = time24h.split(':');
            if (timeParts.length < 2) {
                throw new Error('Invalid time format - expected HH:MM or HH:MM:SS');
            }

            const hours = parseInt(timeParts[0], 10);
            const minutes = timeParts[1];
            
            if (isNaN(hours) || hours < 0 || hours > 23) {
                throw new Error('Invalid hours value');
            }
            
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHour = hours % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        } catch (error) {
            console.error('Error converting to 12-hour format:', error.message);
            return null;
        }
    }

    /**
     * Check if appointment time has expired (with grace period)
     * Can accept either separate date/time parameters or appointment object
     */
    isAppointmentExpired(appointmentDateOrObject, appointmentTimeOrGraceMinutes = null, graceMinutes = 15) {
        let appointmentDate, appointmentTime, actualGraceMinutes;

        // Handle different parameter patterns
        if (typeof appointmentDateOrObject === 'object' && appointmentDateOrObject !== null) {
            // Called with appointment object
            const appointment = appointmentDateOrObject;
            appointmentDate = appointment.appointment_date;
            appointmentTime = appointment.appointment_time;
            actualGraceMinutes = typeof appointmentTimeOrGraceMinutes === 'number' ? appointmentTimeOrGraceMinutes : graceMinutes;
        } else {
            // Called with separate date and time parameters
            appointmentDate = appointmentDateOrObject;
            appointmentTime = appointmentTimeOrGraceMinutes;
            actualGraceMinutes = graceMinutes;
        }

        if (!appointmentDate || !appointmentTime) {
            console.error('Invalid appointment date/time for expiry check:', { appointmentDate, appointmentTime });
            return false;
        }

        try {
            const currentLocal = this.getCurrentLocalTime();
            const appointmentLocal = `${appointmentDate} ${appointmentTime}`;
            
            const currentTime = new Date(currentLocal.replace(' ', 'T'));
            const appointmentDateTime = new Date(appointmentLocal.replace(' ', 'T'));
            
            if (isNaN(currentTime.getTime()) || isNaN(appointmentDateTime.getTime())) {
                throw new Error('Invalid date conversion');
            }
            
            // Add grace period to appointment time
            const appointmentWithGrace = new Date(appointmentDateTime.getTime() + (actualGraceMinutes * 60 * 1000));
            
            console.log('Expiry check:', {
                currentLocal,
                appointmentLocal,
                currentTime: currentTime.toISOString(),
                appointmentWithGrace: appointmentWithGrace.toISOString(),
                isExpired: currentTime > appointmentWithGrace,
                graceMinutes: actualGraceMinutes
            });
            
            return currentTime > appointmentWithGrace;
        } catch (error) {
            console.error('Error checking appointment expiry:', error.message);
            return false;
        }
    }

    /**
     * Prepare appointment data for creation/update
     * This method was missing but being called in your code
     */
    prepareAppointmentData(appointmentDataOrDate, timeString = null) {
        let appointmentData;

        // Handle different input formats
        if (typeof appointmentDataOrDate === 'string' && timeString) {
            // Called with separate date and time strings
            appointmentData = {
                appointment_date: appointmentDataOrDate,
                appointment_time: timeString
            };
        } else if (typeof appointmentDataOrDate === 'object' && appointmentDataOrDate !== null) {
            // Called with appointment object
            appointmentData = appointmentDataOrDate;
        } else {
            console.error('Invalid appointment data provided:', appointmentDataOrDate);
            return null;
        }

        try {
            const prepared = { ...appointmentData };

            // Ensure date is in proper format
            if (prepared.appointment_date) {
                const date = new Date(prepared.appointment_date);
                if (!isNaN(date.getTime())) {
                    prepared.appointment_date = date.toISOString().split('T')[0];
                }
            }

            // Convert time to 24-hour format if it's in 12-hour format
            if (prepared.appointment_time) {
                // Check if it contains AM/PM
                if (prepared.appointment_time.includes('AM') || prepared.appointment_time.includes('PM')) {
                    const converted = this.convertTo24Hour(prepared.appointment_time);
                    if (converted) {
                        prepared.appointment_time = converted;
                    }
                } else {
                    // Ensure time has seconds
                    const timeParts = prepared.appointment_time.split(':');
                    if (timeParts.length === 2) {
                        prepared.appointment_time += ':00';
                    }
                }
            }

            // Set default duration if not provided
            if (!prepared.duration_minutes) {
                prepared.duration_minutes = 90;
            }

            return prepared;
        } catch (error) {
            console.error('Error preparing appointment data:', error.message);
            return null;
        }
    }

    /**
     * Validate appointment data
     */
    validateAppointmentData(appointmentData) {
        const errors = [];

        if (!appointmentData.appointment_date) {
            errors.push('Appointment date is required');
        } else {
            const date = new Date(appointmentData.appointment_date);
            if (isNaN(date.getTime())) {
                errors.push('Invalid appointment date format');
            }
        }

        if (!appointmentData.appointment_time) {
            errors.push('Appointment time is required');
        } else {
            // Validate time format (either 12-hour or 24-hour)
            const time12Regex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
            const time24Regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
            
            if (!time12Regex.test(appointmentData.appointment_time) && 
                !time24Regex.test(appointmentData.appointment_time)) {
                errors.push('Invalid time format. Use HH:MM AM/PM or HH:MM format');
            }
        }

        if (!appointmentData.consultant_id) {
            errors.push('Consultant ID is required');
        }

        if (!appointmentData.title || appointmentData.title.trim().length === 0) {
            errors.push('Appointment title is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get timezone info for debugging
     */
    getTimezoneInfo() {
        const now = new Date();
        return {
            kampalaTime: this.getCurrentLocalTime(),
            utcTime: now.toISOString(),
            timezoneOffset: this.KAMPALA_TIMEZONE_OFFSET,
            timezone: this.KAMPALA_TIMEZONE,
            currentTimestamp: now.getTime()
        };
    }

    /**
     * Format time for display purposes
     */
    formatTimeForDisplay(time24h) {
        const converted = this.convertTo12Hour(time24h);
        return converted || time24h; // fallback to original if conversion fails
    }

    /**
     * Format appointment time in user's timezone (Kampala)
     * Since we store everything in Kampala time, this is mainly for display consistency
     */
    formatInUserTimezone(appointmentDateTimeObject) {
        if (!appointmentDateTimeObject) {
            return null;
        }

        try {
            // If it's already a formatted object from parseAppointmentDateTime
            if (appointmentDateTimeObject.displayTime && appointmentDateTimeObject.displayDate) {
                return `${appointmentDateTimeObject.displayDate} ${appointmentDateTimeObject.displayTime}`;
            }

            // If it's a Date object
            if (appointmentDateTimeObject instanceof Date) {
                return new Intl.DateTimeFormat('en-US', {
                    timeZone: this.KAMPALA_TIMEZONE,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }).format(appointmentDateTimeObject);
            }

            // If it's a string, try to parse it
            if (typeof appointmentDateTimeObject === 'string') {
                const date = new Date(appointmentDateTimeObject);
                if (!isNaN(date.getTime())) {
                    return this.formatInUserTimezone(date);
                }
            }

            return null;
        } catch (error) {
            console.error('Error formatting time in user timezone:', error.message);
            return null;
        }
    }

    /**
     * Create a proper Date object from appointment date and time
     */
    createAppointmentDate(appointmentDate, appointmentTime) {
        if (!appointmentDate || !appointmentTime) {
            return null;
        }

        try {
            const dateTimeString = `${appointmentDate}T${appointmentTime}`;
            const date = new Date(dateTimeString);
            
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date/time combination');
            }
            
            return date;
        } catch (error) {
            console.error('Error creating appointment date:', error.message);
            return null;
        }
    }

    /**
     * Test all time conversion methods
     */
    runTests() {
        console.log('=== Running AppointmentTimeManager Tests ===');
        
        // Test 12-hour to 24-hour conversion
        const test12HourTimes = ['9:30 AM', '2:45 PM', '12:00 PM', '12:00 AM', '11:59 PM'];
        test12HourTimes.forEach(time => {
            const result = this.convertTo24Hour(time);
            console.log(`${time} -> ${result}`);
        });

        // Test 24-hour to 12-hour conversion
        const test24HourTimes = ['09:30:00', '14:45:00', '12:00:00', '00:00:00', '23:59:00'];
        test24HourTimes.forEach(time => {
            const result = this.convertTo12Hour(time);
            console.log(`${time} -> ${result}`);
        });

        // Test current time
        console.log('Current Kampala time:', this.getCurrentLocalTime());
        
        // Test timezone info
        console.log('Timezone info:', this.getTimezoneInfo());
        
        console.log('=== Tests Complete ===');
    }
}

// Fixed Backend API - createAppointment function
export const createAppointment = async (appointment, user_id) => {
    try {
        const [consultants] = await pool.query('SELECT * FROM consultants WHERE id = ?', [appointment.consultant_id]);
        if (consultants.length === 0) {
            return { success: false, message: "Consultant not found or inactive" };
        }

        // Initialize time manager
        const timeManager = new AppointmentTimeManager();
        
        // Prepare and validate appointment data
        const preparedData = timeManager.prepareAppointmentData(appointment);
        if (!preparedData) {
            return { 
                success: false, 
                message: "Invalid appointment data",
                status: 400 
            };
        }

        const validation = timeManager.validateAppointmentData(preparedData);
        if (!validation.isValid) {
            return { 
                success: false, 
                message: validation.errors.join(', '),
                status: 400 
            };
        }

        const durationInMinutes = preparedData.duration_minutes || 90;

        console.log('Creating appointment:', {
            inputDate: preparedData.appointment_date,
            inputTime: preparedData.appointment_time,
            duration: durationInMinutes,
            timezone: 'Africa/Kampala (Local)'
        });

        // Check for conflicts (using local time comparison)
        const [conflicts] = await pool.query(`
            SELECT id, appointment_date, appointment_time, duration_minutes 
            FROM appointments 
            WHERE consultant_id = ? 
            AND status IN ('pending', 'confirmed') 
            AND appointment_date = ?
            AND (
                -- Exact time match
                appointment_time = ? OR
                -- Overlapping appointments check
                (
                    TIME(appointment_time) < TIME(ADDTIME(?, SEC_TO_TIME(? * 60))) AND 
                    TIME(ADDTIME(appointment_time, SEC_TO_TIME(duration_minutes * 60))) > TIME(?)
                )
            )
        `, [
            preparedData.consultant_id,
            preparedData.appointment_date,
            preparedData.appointment_time,
            preparedData.appointment_time,
            durationInMinutes,
            preparedData.appointment_time
        ]);

        if (conflicts.length > 0) {
            console.log('Time slot conflict detected:', {
                conflicts,
                requestedDate: preparedData.appointment_date,
                requestedTime: preparedData.appointment_time
            });
            
            return { 
                success: false, 
                message: "Time slot is already booked",
                status: 409,
                conflicts
            };
        }

        // Insert appointment (store in local Kampala time)
        const [result] = await pool.query(`
            INSERT INTO appointments (
                user_id, consultant_id, title, description, 
                appointment_date, appointment_time, duration_minutes, 
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', UTC_TIMESTAMP())
        `, [
            user_id,
            preparedData.consultant_id,
            preparedData.title,
            preparedData.description || null,
            preparedData.appointment_date,
            preparedData.appointment_time,
            durationInMinutes
        ]);

        console.log('Appointment created successfully:', {
            appointmentId: result.insertId,
            storedDate: preparedData.appointment_date,
            storedTime: preparedData.appointment_time,
            duration: durationInMinutes,
            timezone: 'Kampala Local Time'
        });

        return {
            success: true,
            message: 'Appointment created successfully',
            appointment: {
                id: result.insertId,
                user_id,
                consultant_id: preparedData.consultant_id,
                title: preparedData.title,
                description: preparedData.description,
                appointment_date: preparedData.appointment_date,
                appointment_time: preparedData.appointment_time,
                duration_minutes: durationInMinutes,
                status: 'pending'
            }
        };

    } catch (error) {
        console.error('Error creating appointment:', {
            error: error.message,
            stack: error.stack,
            appointmentData: appointment
        });
        return {
            success: false,
            message: "Failed to create appointment",
            status: 500
        };
    }
};

// Export the time manager instance
export const appointmentTimeManager = new AppointmentTimeManager();
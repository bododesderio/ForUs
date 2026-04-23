import React, { createContext, useContext, useState } from 'react';

const ConsultantContext = createContext();

export const ConsultantProvider = ({ children }) => {
    const [selectedConsultant, setSelectedConsultant] = useState(null);
    const [appointmentData, setAppointmentData] = useState({
        selectedDate: null,
        selectedTime: null,
    });

    const selectConsultant = (consultant) => {
        setSelectedConsultant(consultant);
    };

    const clearConsultant = () => {
        setSelectedConsultant(null);
        setAppointmentData({
            selectedDate: null,
            selectedTime: null,
        });
    };

    const updateAppointmentData = (data) => {
        setAppointmentData(prev => ({ ...prev, ...data }));
    };

    return (
        <ConsultantContext.Provider value={{
            selectedConsultant,
            appointmentData,
            selectConsultant,
            clearConsultant,
            updateAppointmentData
        }}>
            {children}
        </ConsultantContext.Provider>
    );
};

export const useConsultant = () => {
    const context = useContext(ConsultantContext);
    if (!context) {
        throw new Error('useConsultant must be used within a ConsultantProvider');
    }
    return context;
};
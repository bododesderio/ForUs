import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import { getTheme, THEME_NAMES } from '../constants/theme';

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = Appearance.getColorScheme();
    const [themeName, setThemeName] = useState('blue');
    const [mode, setMode] = useState<'light' | 'dark'>(systemColorScheme ?? 'light');

    useEffect(() => {
        const listener = Appearance.addChangeListener(({ colorScheme }) => {
        setMode(colorScheme ?? 'light');
        });
        return () => listener.remove();
    }, []);

    const theme = getTheme(themeName, mode);

    return (
        <ThemeContext.Provider value={{
        themeName,
        setThemeName,
        mode,
        setMode,
        COLORS: theme,
        THEME_NAMES
        }}>
        {children}
        </ThemeContext.Provider>
    );
};

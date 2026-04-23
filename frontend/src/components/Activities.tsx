import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native'
import React from 'react'
import { ActivityType } from '../data/activity-data';
import { useTheme } from '../context/ThemeContext';

// Helper to normalize image source for local and remote images
const getImageSource = (image: any) => {
    if (typeof image === 'string') {
        // Remote URL
        return { uri: image };
    }
    // Local require
    return image;
};

type Activities = {
    index: number;
    activity: ActivityType;
}

const Activities = ({index, activity}:Activities) => {
    const { COLORS } = useTheme();

    const styles = StyleSheet.create({   
    activityItem: {
        alignItems: 'center',
        marginRight: 16,
    },
    activityImage: {
        width: 42,
        height: 42,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activityText: {
        fontSize: 14,
        color: COLORS.textDark,
        marginTop: 8,
        textAlign: 'center',
        maxWidth: 100,
    },
})
    return (
        <TouchableOpacity
            key={index}
            style={styles.activityItem}
            onPress={() => {
            console.log(`Tapped ${activity.type}`);
            }}
        >
            <Image
            style={styles.activityImage}
            source={getImageSource(activity.image)}
            defaultSource={require('../assets/icons/default.png')}
            />
            <Text style={styles.activityText}>{activity.timestamp}</Text>
        </TouchableOpacity>
    )
}

export default Activities
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { data } from '../data/action-data';

const QuickActionsContent = () => {
    const quickActions = data;



    return (
        <View style={styles.quickActionsGrid}>
            <View style={styles.leftColumn}>
                {quickActions.slice(0, 2).map((action) => (
                    <TouchableOpacity
                        key={action.id}
                        style={[
                            styles.quickActionCard,
                            { backgroundColor: action.backgroundColor },
                            action.id === 1 ? styles.largeCard : styles.smallCard
                        ]}
                        onPress={action.action}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[action.backgroundColor, `${action.backgroundColor}80`]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.contentContainer}
                        >
                            <View style={styles.patternOverlay} />
                            <View style={[
                                styles.quickActionIcon,
                                action.id === 1 ? { marginBottom: 'auto' } : { marginBottom: 12 }
                            ]}>
                                <Ionicons 
                                    name={action.icon} 
                                    size={action.id === 1 ? 36 : 28} 
                                    color="white" 
                                />
                            </View>
                            <View style={[
                                styles.textContainer,
                                action.id === 1 ? { marginTop: 'auto' } : null
                            ]}>
                                <Text 
                                    style={[
                                        styles.quickActionTitle,
                                        action.id === 1 ? styles.largeCardTitle : styles.smallCardTitle
                                    ]}
                                    numberOfLines={2}
                                    adjustsFontSizeToFit
                                >
                                    {action.title}
                                </Text>
                                <Text 
                                    style={[
                                        styles.quickActionSubtitle,
                                        action.id === 1 ? styles.largeCardSubtitle : styles.smallCardSubtitle
                                    ]}
                                    numberOfLines={2}
                                    adjustsFontSizeToFit
                                >
                                    {action.subtitle}
                                </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.rightColumn}>
                {quickActions.slice(2, 4).map((action) => (
                    <TouchableOpacity
                        key={action.id}
                        style={[
                            styles.quickActionCard,
                            { backgroundColor: action.backgroundColor },
                            action.id === 4 ? styles.largeCard : styles.smallCard
                        ]}
                        onPress={action.action}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[action.backgroundColor, `${action.backgroundColor}80`]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.contentContainer}
                        >
                            <View style={styles.patternOverlay} />
                            <View style={[
                                styles.quickActionIcon,
                                action.id === 4 ? { marginBottom: 'auto' } : { marginBottom: 12 }
                            ]}>
                                <Ionicons 
                                    name={action.icon} 
                                    size={action.id === 4 ? 36 : 28} 
                                    color="white" 
                                />
                            </View>
                            <View style={[
                                styles.textContainer,
                                action.id === 4 ? { marginTop: 'auto' } : null
                            ]}>
                                <Text 
                                    style={[
                                        styles.quickActionTitle,
                                        action.id === 4 ? styles.largeCardTitle : styles.smallCardTitle
                                    ]}
                                    numberOfLines={2}
                                    adjustsFontSizeToFit
                                >
                                    {action.title}
                                </Text>
                                <Text 
                                    style={[
                                        styles.quickActionSubtitle,
                                        action.id === 4 ? styles.largeCardSubtitle : styles.smallCardSubtitle
                                    ]}
                                    numberOfLines={2}
                                    adjustsFontSizeToFit
                                >
                                    {action.subtitle}
                                </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    quickActionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        height: 320,
    },
    leftColumn: {
        flex: 1,
        gap: 12,
    },
    rightColumn: {
        flex: 1,
        gap: 12,
    },
    quickActionCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 5.84,
        elevation: 7,
    },
    largeCard: {
        height: 180,
    },
    smallCard: {
        height: 120,
    },
    patternOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.15,
        transform: [{ rotate: '45deg' }],
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    contentContainer: {
        flex: 1,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    largeCardContent: {
        padding: 20,
    },
    smallCardContent: {
        padding: 16,
    },
    quickActionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    textContainer: {
        gap: 4,
    },
    quickActionTitle: {
        fontWeight: 'bold',
        color: 'white',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    largeCardTitle: {
        fontSize: 22,
        marginBottom: 8,
    },
    smallCardTitle: {
        fontSize: 16,
        marginBottom: 4,
    },
    quickActionSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    largeCardSubtitle: {
        fontSize: 14,
    },
    smallCardSubtitle: {
        fontSize: 12,
    },
})

export default QuickActionsContent;
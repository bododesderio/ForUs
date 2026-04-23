import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { router } from 'expo-router';
import { fetchResources } from '../../services/api';

// Resource type for backend resource objects
interface Resource {
    id: number;
    title: string;
    description: string;
    type: string;
    file_url: string;
    preview_image_url?: string;
    [key: string]: any;
}

const CATEGORY_MAP = {
    books: 'book',
    audio: 'audio',
    articles: 'article',
    routines: 'routine',
    music: 'music',
    podcasts: 'podcast',
};

const resourcesMeta = [
    {
        id: 'books',
        title: 'Books',
        description: 'Explore mental health books for personal growth and understanding.',
        gradient: ['#667eea', '#764ba2'],
        icon: '📚',
    },
    {
        id: 'audio',
        title: 'Audio',
        description: 'Listen to guided audio sessions for relaxation and focus.',
        gradient: ['#f093fb', '#f5576c'],
        icon: '🎧',
    },
    {
        id: 'articles',
        title: 'Articles',
        description: 'Read insightful articles on mental wellness and coping strategies.',
        gradient: ['#4facfe', '#00f2fe'],
        icon: '📰',
    },
    {
        id: 'routines',
        title: 'Routines',
        description: 'Build daily routines to support your mental health journey.',
        gradient: ['#43e97b', '#38f9d7'],
        icon: '⏰',
    },
    {
        id: 'music',
        title: 'Music',
        description: 'Discover calming music playlists to soothe your mind.',
        gradient: ['#fa709a', '#fee140'],
        icon: '🎵',
    },
    {
        id: 'podcasts',
        title: 'Podcasts',
        description: 'Tune into podcasts discussing mental health and well-being.',
        gradient: ['#a8edea', '#fed6e3'],
        icon: '🎙️',
    },
    {
        id: 'apply',
        title: 'Apply for Resources',
        description: 'Need additional support? Apply for personalized mental health resources.',
        gradient: ['#ff9a9e', '#fecfef'],
        icon: '✨',
        isApplyCard: true,
    },
];

const Resources = () => {
    const { width } = useWindowDimensions();
    const navigation = useNavigation();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { COLORS } = useTheme();

    useEffect(() => {
        const loadResources = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchResources();
            setResources(data.resources || []);
        } catch (err) {
            setError('Failed to load resources.');
        } finally {
            setLoading(false);
        }
        };
        loadResources();
    }, []);

    const handleCategoryPress = (categoryId: keyof typeof CATEGORY_MAP) => {
        const backendType = CATEGORY_MAP[categoryId];
        const filtered = resources.filter((r) => r.type === backendType);
        const routeMap: Record<keyof typeof CATEGORY_MAP, string> = {
        books: '/(screens)/BooksScreen',
        audio: '/(screens)/AudioScreen',
        articles: '/(screens)/ArticlesScreen',
        routines: '/(screens)/RoutinesScreen',
        music: '/(screens)/MusicScreen',
        podcasts: '/(screens)/PodcastsScreen',
        };
        const route = routeMap[categoryId];
        if (route) {
        router.push({ pathname: route, params: { resources: JSON.stringify(filtered) } });
        }
    };

    const styles = StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: COLORS.background,
},
headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#e0e0e0',
},
backButton: {
    padding: 8,
    marginRight: 12,
},
headerTextContainer: {
    flex: 1,
},
headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textDark || '#1a1a1a',
    letterSpacing: -0.5,
},
headerSubtitle: {
    fontSize: 14,
    color: COLORS.grey || '#666',
    marginTop: 2,
    fontWeight: '400',
},
listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
},
cardRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
},
card: {
    width: '48%',
    backgroundColor: COLORS.cardBackground || '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
},
cardHeader: {
    padding: 16,
    paddingBottom: 8,
},
iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
},
cardIcon: {
    fontSize: 24,
},
cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
},
cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark || '#1a1a1a',
    marginBottom: 6,
},
cardDescription: {
    fontSize: 13,
    color: COLORS.grey || '#666',
    lineHeight: 18,
    fontWeight: '400',
},
footer: {
    height: 3,
},
gradientBorder: {
    flex: 1,
},
applyCard: {
    width: '100%',
    marginBottom: 16,
},
applyGradient: {
    flex: 1,
    borderRadius: 16,
},
applyContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: "center",
    minHeight: 180,
},
applyIcon: {
    fontSize: 32,
    marginBottom: 12,
},
applyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
},
applyDescription: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 20,
},
applyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
},
applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign:'center',
},
});

    const renderItem = ({ item }: { item: typeof resourcesMeta[number] }) => {
        if (item.isApplyCard) {
        return (
            <TouchableOpacity
            style={[styles.card, styles.applyCard]}
            onPress={() => {
                // TODO: Navigate to application form
            }}
            >
            <LinearGradient
                colors={item.gradient}
                style={styles.applyGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.applyContent}>
                <Text style={styles.applyIcon}>{item.icon}</Text>
                <Text style={styles.applyTitle}>{item.title}</Text>
                <Text style={styles.applyDescription}>{item.description}</Text>
                <View style={styles.applyButton}>
                    <Text style={styles.applyButtonText}>Get Started</Text>
                </View>
                </View>
            </LinearGradient>
            </TouchableOpacity>
        );
        }
        return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleCategoryPress(item.id as keyof typeof CATEGORY_MAP)}
        >
            <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: item.gradient[0] + '20' }]}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
            </View>
            </View>
            <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription} numberOfLines={3}>
                {item.description}
            </Text>
            </View>
            <View style={styles.footer}>
            <LinearGradient
                colors={item.gradient}
                style={styles.gradientBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            />
            </View>
        </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
            <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            >
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark || '#333'} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Resources</Text>
            <Text style={styles.headerSubtitle}>Discover tools for your wellness journey</Text>
            </View>
        </View>
        {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary || '#667eea'} />
            </View>
        ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'red' }}>{error}</Text>
            </View>
        ) : (
            <FlatList
            data={resourcesMeta}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            />
        )}
        <StatusBar style="AUTO" />
        </SafeAreaView>
    );
};

export default Resources;
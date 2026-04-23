import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

interface Resource {
  id: number;
  title: string;
  description: string;
  image?: string;
  preview_image_url?: string;
  file_url: string;
  type: string;
  [key: string]: any;
}

const AudioScreen = () => {
  const params = useLocalSearchParams();
  const resources: Resource[] | null = useMemo(() => {
    if (params.resources) {
      try {
        return JSON.parse(params.resources as string);
      } catch {
        return null;
      }
    }
    return null;
  }, [params.resources]);
  const { COLORS } = useTheme();

  const renderItem = ({ item }: { item: Resource }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push({
        pathname: '/(screens)/ResourceViewerScreen',
        params: { title: item.title, file_url: item.file_url, preview_image_url: item.preview_image_url, author: item.author }
      })}
    >
      <View style={styles.cardBody}>
        <Image source={{ uri: item.preview_image_url || item.image || undefined }} style={styles.thumbnailRow} />
        <Text style={styles.cardTitleRow}>{item.title}</Text>
        <Text style={styles.cardDescriptionRow}>{item.description}</Text>
        <TouchableOpacity
          style={styles.downloadButton}
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation?.();
            router.push({
              pathname: '/(screens)/ResourceViewerScreen',
              params: { title: item.title, file_url: item.file_url, preview_image_url: item.preview_image_url, author: item.author }
            });
          }}
        >
          <Ionicons name="arrow-down-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.downloadButtonText}>Play</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    padding: 16, 
    backgroundColor: COLORS.background, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  backButton: { 
    padding: 8, 
    marginRight: 12 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: COLORS.textDark 
  },
  headerDescription: { 
    fontSize: 15, 
    color: COLORS.textDark, 
    marginTop: 2, 
    fontWeight: '400' 
  },
  content: { 
    padding: 24 
  },
  cardRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginBottom: 16 
  },
  card: {
    flex: 1,
    minWidth: 0,
    maxWidth: '48%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    padding: 0,
    marginHorizontal: 4,
  },
  cardBody: { 
    alignItems: 'center', 
    padding: 16, 
    paddingBottom: 8 
  },
  thumbnailRow: { 
    width: '100%', 
    height: 100, 
    borderRadius: 12, 
    marginBottom: 10, 
    backgroundColor: '#eee' 
  },
  cardTitleRow: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: COLORS.textDark, 
    marginBottom: 6 },
  cardDescriptionRow: { 
    fontSize: 13, 
    color: COLORS.grey, 
    lineHeight: 18, 
    fontWeight: '400', 
    marginBottom: 8 
  },
  downloadButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.primary, 
    borderRadius: 25, 
    paddingVertical: 10, 
    paddingHorizontal: 22, 
    alignSelf: 'center', 
    marginTop: 8, 
    marginBottom: 8, 
    shadowColor: COLORS.primary, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 6,
    elevation: 2 
  },
  downloadButtonText: { 
    color: COLORS.white, 
    fontWeight: '600', 
    fontSize: 16 
  },
});

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Audio</Text>
          <Text style={styles.headerDescription}>Listen to guided audio sessions for relaxation and focus.</Text>
        </View>
      </View>
      {!resources ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : resources.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.grey, fontSize: 16 }}>No audio resources found.</Text>
        </View>
      ) : (
        <FlatList
          data={resources}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.cardRow}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default AudioScreen;

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import { Video } from 'expo-video';

const getFileExtension = (url: string) => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  return match ? match[1].toLowerCase() : '';
};

const ResourceViewerScreen = () => {
  const params = useLocalSearchParams();
  const { COLORS } = useTheme();
  // Accept url, file_url, or resource object
  let resourceUrl: string | undefined = undefined;
  let resourceTitle: string | undefined = undefined;
  let resourceAuthor: string | undefined = undefined;
  let resourcePreviewImage: string | undefined = undefined;
  if (params.resource) {
    try {
      const resourceObj = typeof params.resource === 'string' ? JSON.parse(params.resource) : params.resource;
      resourceUrl = resourceObj.file_url || resourceObj.url || resourceObj.preview_image_url;
      resourceTitle = resourceObj.title;
      resourceAuthor = resourceObj.author || resourceObj.artist || resourceObj.uploader || resourceObj.created_by;
      resourcePreviewImage = resourceObj.preview_image_url || resourceObj.coverArt || resourceObj.image;
    } catch {
      // fallback below
    }
  }
  if (!resourceUrl) resourceUrl = (params.file_url as string) || (params.url as string) || (params.preview_image_url as string);
  if (!resourceTitle) resourceTitle = (params.title as string) || 'Resource';
  if (!resourceAuthor) resourceAuthor = (params.author as string) || (params.artist as string) || (params.uploader as string) || (params.created_by as string);
  if (!resourcePreviewImage) resourcePreviewImage = (params.preview_image_url as string) || (params.coverArt as string) || (params.image as string);
  const extension = resourceUrl ? getFileExtension(resourceUrl) : '';
  const videoRef = useRef<any>(null);

  // Helper to render content based on file type
  const renderContent = () => {
    if (!resourceUrl) return <Text style={{ color: COLORS.error || 'red', marginTop: 24 }}>No resource URL provided.</Text>;
    if (["mp3", "wav", "ogg", "m4a"].includes(extension)) {
      // Audio file: use modern audio player
      return <ModernAudioPlayer url={resourceUrl} title={resourceTitle} artist={resourceAuthor} coverArt={resourcePreviewImage} />;
    }
    if (["mp4", "mov", "webm"].includes(extension)) {
      // Video file: use expo-video
      return (
        <View style={{ width: '100%', aspectRatio: 16/9, marginTop: 16 }}>
          <Video
            ref={videoRef}
            source={{ uri: resourceUrl }}
            useNativeControls
            resizeMode="contain"
            style={{ width: '100%', height: 220, borderRadius: 12 }}
          />
        </View>
      );
    }
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
      // Image file
      return (
        <Image source={{ uri: resourceUrl }} style={{ width: '100%', height: 320, borderRadius: 12, marginTop: 16 }} resizeMode="contain" />
      );
    }
    if (["pdf"].includes(extension)) {
      // PDF: use Google Docs Viewer in WebView, full screen, no padding or margin, with floating back button
      const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resourceUrl)}`;
      return (
        <View style={{ flex: 1, width: '100%', height: '100%', margin: 0, padding: 0, alignSelf: 'stretch', backgroundColor: COLORS.background }}>
          <WebView source={{ uri: googleDocsUrl }} style={{ flex: 1, borderRadius: 0, overflow: 'hidden', width: '100%', height: '100%', alignSelf: 'stretch', margin: 0, padding: 0, backgroundColor: COLORS.background }} />
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 40, // adjust for status bar if needed
              left: 16,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              padding: 8,
              zIndex: 10,
            }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
    if (["html", "htm"].includes(extension)) {
      // HTML: use WebView directly
      return (
        <View style={{ flex: 1, width: '100%', height: 400, marginTop: 16 }}>
          <WebView source={{ uri: resourceUrl }} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }} />
        </View>
      );
    }
    // Default: try WebView
    return (
      <View style={{ flex: 1, width: '100%', height: 400, marginTop: 16 }}>
        <WebView source={{ uri: resourceUrl }} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }} />
      </View>
    );
  };

  const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textDark },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0, width: '100%' },
});

  return (
    <SafeAreaView style={styles.container}>
      {/* Hide header for PDF fullscreen mode */}
      {(extension !== 'pdf') && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{resourceTitle}</Text>
        </View>
      )}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

// Modern Audio Player
const ModernAudioPlayer = ({ url, title, artist, coverArt }: { url: string, title?: string, artist?: string, coverArt?: string }) => {
  const [sound, setSound] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const { COLORS } = useTheme();

  useEffect(() => {
    let isMounted = true;
    async function loadAudio() {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      if (url) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );
        if (isMounted) setSound(newSound);
      }
    }
    loadAudio();
    return () => {
      isMounted = false;
      if (sound) sound.unloadAsync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleSeek = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const modernStyles = StyleSheet.create({
    container: { alignItems: 'center', width: '100%', padding: 24 },
    coverArt: { width: 120, height: 120, borderRadius: 12, marginBottom: 16 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4, color: COLORS.textDark },
    artist: { fontSize: 16, color: COLORS.grey, marginBottom: 16 },
    slider: { width: '100%', height: 40 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    time: { fontSize: 12, color: COLORS.lightGrey },
    playButton: { backgroundColor: COLORS.primary, borderRadius: 32, padding: 18, marginTop: 16 },
  });

  return (
    <View style={modernStyles.container}>
      {coverArt && <Image source={{ uri: coverArt }} style={modernStyles.coverArt} />}
      <Text style={modernStyles.title}>{title || 'Audio Track'}</Text>
      {artist && <Text style={modernStyles.artist}>{artist}</Text>}
      <Slider
        style={modernStyles.slider}
        minimumValue={0}
        maximumValue={duration}
        value={position}
        onSlidingComplete={handleSeek}
        minimumTrackTintColor="#007AFF"
        maximumTrackTintColor="#ccc"
        thumbTintColor="#007AFF"
      />
      <View style={modernStyles.timeRow}>
        <Text style={modernStyles.time}>{formatTime(position)}</Text>
        <Text style={modernStyles.time}>{formatTime(duration)}</Text>
      </View>
      <TouchableOpacity style={modernStyles.playButton} onPress={handlePlayPause} disabled={!sound}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default ResourceViewerScreen;

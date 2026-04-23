import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Image,
  FlatList,
  Alert,
  Dimensions,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/authContext';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadResource as uploadToCloudinary, CloudinarySignatureResponse } from '../../../services/cloudinaryUpload';
import { uploadResource as uploadResourceApi, fetchResources as fetchResourcesApi } from '../../../services/api';
import { API_BASE_URL } from '../../../services/api';

const { width } = Dimensions.get('window');

type FileAsset = {
  uri: string;
  name: string;
  mimeType: string | undefined;
};

type ImageAsset = {
  uri: string;
  name?: string;
  mimeType?: string;
};

export default function MediaLibraryScreen() {
  const { user } = useAuth();
  const { COLORS } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const scrollViewRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: string;
    previewImage: ImageAsset | null;
    file: FileAsset | null;
    type: string;
  }>({
    title: '',
    description: '',
    category: '',
    previewImage: null,
    file: null,
    type: ''
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Categories for dropdown
  const categories = [
    'Mental Health',
    'Physical Wellness',
    'Psychology',
    'Relaxation',
    'Nutrition',
    'Lifestyle',
    'Education',
    'Self-Help',
    'Meditation',
    'Exercise'
  ];

  const name = `${user?.first_name} ${user?.last_name}`

  // Fetch resources from backend
  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      try {
        const data = await fetchResourcesApi();
        // Map backend data to MediaItem[]
        const mapped = (data.resources || []).map((item: any) => ({
          id: item.id?.toString() || Date.now().toString(),
          title: item.title,
          type: item.type,
          category: item.category,
          author: item.author || 'Unknown',
          duration: item.duration || '',
          thumbnail: item.preview_image_url || item.file_url || '',
          uploadDate: item.uploadDate || item.created_at?.split('T')[0] || item.upload_date?.split('T')[0] || '',
          downloads: item.downloads || 0,
          rating: item.rating || 0,
        }));
        setMediaItems(mapped);
      } catch (error) {
        Alert.alert('Error', 'Could not fetch resources');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResources();
  }, []);

  const tabs = [
    { id: 'all', title: 'All', icon: 'grid-outline' },
    { id: 'book', title: 'Books', icon: 'book-outline' },
    { id: 'article', title: 'Articles', icon: 'document-text-outline' },
    { id: 'music', title: 'Music', icon: 'musical-notes-outline' },
    { id: 'audio', title: 'Audio', icon: 'headset-outline' },
    { id: 'podcast', title: 'Podcasts', icon: 'mic-outline' },
    { id: 'routine', title: 'Routines', icon: 'repeat-outline' },
    { id: 'video', title: 'Videos', icon: 'videocam-outline' },
  ];

  const filteredItems = activeTab === 'all' 
    ? mediaItems 
    : mediaItems.filter(item => item.type === activeTab);

  const handleUpload = () => {
    setShowUploadModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowUploadModal(false);
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        previewImage: null,
        file: null,
        type: ''
      });
      setShowCategoryDropdown(false);
    });
  };

  const handleSelectPreviewImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFormData(prev => ({
          ...prev,
          previewImage: {
            uri: asset.uri,
            name: asset.fileName || 'preview.jpg',
            mimeType: asset.mimeType || 'image/jpeg',
          }
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleFileUpload = async (type) => {
    try {
      let result;
      // Map resource types to correct MIME types for DocumentPicker
      switch (type) {
        case 'book':
        case 'article':
          result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
            copyToCacheDirectory: true,
          });
          break;
        case 'music':
        case 'audio':
        case 'podcast':
          result = await DocumentPicker.getDocumentAsync({
            type: ['audio/*', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'],
            copyToCacheDirectory: true,
          });
          break;
        case 'routine':
          result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'text/plain'],
            copyToCacheDirectory: true,
          });
          break;
        case 'image':
          result = await DocumentPicker.getDocumentAsync({
            type: 'image/*',
            copyToCacheDirectory: true,
          });
          break;
        case 'video':
          result = await DocumentPicker.getDocumentAsync({
            type: 'video/*',
            copyToCacheDirectory: true,
          });
          break;
        default:
          result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
          });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFormData(prev => ({
          ...prev,
          file: {
            uri: asset.uri,
            name: asset.name || 'resource',
            mimeType: asset.mimeType || '',
          },
          type: type
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const handleSubmitUpload = async () => {
    // Validate form
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.file) {
      Alert.alert('Error', 'Please select a file to upload');
      return;
    }
    setIsUploading(true);
    try {
      // 1. Upload file to Cloudinary
      const backendSignatureUrl = `${API_BASE_URL}/cloudinary-signature?folder=resources`; // Replace with your backend URL
      const fileUrl = await uploadToCloudinary(
        formData.file.uri,
        backendSignatureUrl,
        formData.file.mimeType || 'application/octet-stream',
        formData.file.name || 'resource'
      );
      // 2. Upload preview image if present
      let previewImageUrl = '';
      if (formData.previewImage?.uri) {
        previewImageUrl = await uploadToCloudinary(
          formData.previewImage.uri,
          backendSignatureUrl,
          formData.previewImage.mimeType || 'image/jpeg',
          formData.previewImage.name || 'preview.jpg'
        );
      }
      // 3. Send resource metadata to backend
      const resourcePayload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        file_url: fileUrl,
        preview_image_url: previewImageUrl,
        author: name || 'Current User',
        duration: 'New',
      };
      await uploadResourceApi(resourcePayload);
      // 4. Add new item to local state (optional, for instant UI update)
      const newItem = {
        id: Date.now().toString(),
        ...resourcePayload,
        thumbnail: previewImageUrl || fileUrl,
        uploadDate: new Date().toISOString().split('T')[0],
        downloads: 0,
        rating: 0,
      };
      setMediaItems(prev => [newItem, ...prev]);
      setIsUploading(false);
      closeModal();
      Alert.alert('Success', 'Resource uploaded successfully!');
    } catch (error) {
      setIsUploading(false);
      Alert.alert('Error', 'Failed to upload resource');
    }
  };

  const getMediaIcon = (type: string): any => {
    switch (type) {
      case 'book': return 'book-outline';
      case 'article': return 'document-text-outline';
      case 'music': return 'musical-notes-outline';
      case 'video': return 'videocam-outline';
      default: return 'document-outline';
    }
  };

  interface MediaItem {
    id: string;
    title: string;
    type: string;
    category: string;
    author: string;
    duration: string;
    thumbnail: string;
    uploadDate: string;
    downloads: number;
    rating: number;
  }

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity style={styles.mediaCard} activeOpacity={0.7}>
      <Image source={{ uri: item.thumbnail }} style={styles.mediaThumbnail} />
      <View style={styles.mediaOverlay}>
        <Ionicons 
          name={getMediaIcon(item.type)} 
          size={24} 
          color={COLORS.white} 
          style={styles.mediaTypeIcon}
        />
      </View>
      
      <View style={styles.mediaInfo}>
        <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.mediaAuthor}>By {item.author}</Text>
        <Text style={styles.mediaCategory}>{item.category}</Text>
        
        <View style={styles.mediaStats}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{item.duration}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="download-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{item.downloads}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.statText}>{item.rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  interface TabItem {
    id: string;
    title: string;
    icon: string;
  }

  const renderTab = (tab: TabItem) => (
    <TouchableOpacity
      key={tab.id}
      style={[styles.tab, activeTab === tab.id && styles.activeTab]}
      onPress={() => setActiveTab(tab.id)}
    >
      <Ionicons 
        name={tab.icon as any} 
        size={20} 
        color={activeTab === tab.id ? COLORS.white : COLORS.textSecondary} 
      />
      <Text style={[
        styles.tabText, 
        activeTab === tab.id && styles.activeTabText
      ]}>
        {tab.title}
      </Text>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tabsContainer: {
    maxHeight: 45,
  },
  tabsContent: {
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  activeTabText: {
    color: COLORS.white,
  },
  mediaGrid: {
    padding: 20,
    // marginTop: 8
  },
  row: {
    justifyContent: 'space-between',
  },
  mediaCard: {
    width: (width - 50) / 2,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
  },
  mediaThumbnail: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  mediaOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaTypeIcon: {
    opacity: 0.9,
  },
  mediaInfo: {
    padding: 12,
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
    lineHeight: 18,
  },
  mediaAuthor: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  mediaCategory: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  mediaStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: COLORS.inputBackground,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.inputBackground,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.textDark,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    maxHeight: 150,
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.textDark,
  },
  imageSelector: {
    borderWidth: 2,
    borderColor: COLORS.lightGrey,
    borderRadius: 12,
    borderStyle: 'dashed',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    marginLeft: 8,
  },
  fileOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fileOption: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    marginBottom: 8,
  },
  fileOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textDark,
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.lightGrey,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Media Library</Text>
        <TouchableOpacity onPress={handleUpload} style={styles.uploadButton}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{mediaItems.length}</Text>
          <Text style={styles.statLabel}>Total Resources</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {mediaItems.reduce((sum, item) => sum + item.downloads, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Downloads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>4.8</Text>
          <Text style={styles.statLabel}>Avg. Rating</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(renderTab)}
      </ScrollView>

      {/* Media Grid */}
      <View style={{ flex: 1}}>
        {isLoading ? (
          // Skeleton loader (simple version)
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 16, color: COLORS.textSecondary }}>Loading resources...</Text>
            <View style={{ flexDirection: 'row', marginTop: 32 }}>
              {[1,2].map((_, idx) => (
                <View key={idx} style={{
                  width: (width - 50) / 2,
                  height: 180,
                  backgroundColor: COLORS.lightGrey,
                  borderRadius: 12,
                  marginHorizontal: 8,
                  opacity: 0.4
                }} />
              ))}
            </View>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 16, textAlign: 'center' }}>
              No resources found.
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              Try uploading a new resource or check back later.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={scrollViewRef}
            data={filteredItems}
            renderItem={renderMediaItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.mediaGrid}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  })
                }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Resource</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter resource title"
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  maxLength={100}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter a brief description"
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  multiline={true}
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              {/* Category Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.category && styles.placeholderText
                  ]}>
                    {formData.category || 'Select a category'}
                  </Text>
                  <Ionicons 
                    name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                      {categories.map((category, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, category }));
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{category}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Preview Image */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Preview Image</Text>
                <TouchableOpacity
                  style={styles.imageSelector}
                  onPress={handleSelectPreviewImage}
                >
                  {formData.previewImage ? (
                    <View style={styles.selectedImageContainer}>
                      <Image 
                        source={{ uri: formData.previewImage.uri }} 
                        style={styles.selectedImage} 
                      />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="camera" size={20} color={COLORS.white} />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color={COLORS.textSecondary} />
                      <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* File Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select File *</Text>
                {formData.file ? (
                  <View style={styles.selectedFile}>
                    <Ionicons name="document" size={20} color={COLORS.primary} />
                    <Text style={styles.selectedFileName}>{formData.file.name}</Text>
                    <TouchableOpacity
                      onPress={() => setFormData(prev => ({ ...prev, file: null, type: '' }))}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.fileOptions}>
                    <TouchableOpacity 
                      style={styles.fileOption}
                      onPress={() => handleFileUpload('book')}
                    >
                      <Ionicons name="book-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.fileOptionText}>Book</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fileOption}
                      onPress={() => handleFileUpload('article')}
                    >
                      <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.fileOptionText}>Article</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fileOption}
                      onPress={() => handleFileUpload('music')}
                    >
                      <Ionicons name="musical-notes-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.fileOptionText}>Music</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fileOption}
                      onPress={() => handleFileUpload('audio')}
                    >
                      <Ionicons name="headset-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.fileOptionText}>Audio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fileOption}
                      onPress={() => handleFileUpload('podcast')}
                    >
                      <Ionicons name="mic-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.fileOptionText}>Podcast</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fileOption}
                      onPress={() => handleFileUpload('routine')}
                    >
                      <Ionicons name="repeat-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.fileOptionText}>Routine</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fileOption}
                      onPress={() => handleFileUpload('video')}
                    >
                      <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.fileOptionText}>Video</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fileOption}
                      onPress={() => handleFileUpload('image')}
                    >
                      <Ionicons name="image-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.fileOptionText}>Image</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isUploading && styles.submitButtonDisabled]}
              onPress={handleSubmitUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <Text style={styles.submitButtonText}>Uploading...</Text>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Upload Resource</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}
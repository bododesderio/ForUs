import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useConsultant } from '../../context/consultantContext';
import { getConsultantReviewsPaginated, submitReview } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ToastMessage from '../../components/ToastMessage';

export default function DoctorDetailsScreen() {
    const { COLORS } = useTheme();
  const navigation = useNavigation();
  const { selectedConsultant } = useConsultant();
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at' or 'rating'
  const [sortOrder, setSortOrder] = useState('DESC'); // 'ASC' or 'DESC'
  const REVIEWS_PER_PAGE = 10;

  // Default fallback data
  const defaultDoctorData = {
      name: "Dr Claire Jenkins",
      specialty: "General practitioners",
      profilePicture: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
      rating: 4.9,
      experience: "16 years",
      languages: ["English", "Arabic", "Russian"],
      education: "United Arab Emirates University, 2009",
      price: 80
  };

  // Get consultant data from context or use default
  const consultantData = selectedConsultant ? {
      name: `${selectedConsultant.first_name || ''} ${selectedConsultant.last_name || ''}`.trim(),
      specialty: selectedConsultant.specialty || "General practitioners",
      profilePicture: selectedConsultant.profile_image || defaultDoctorData.profilePicture,
      rating: selectedConsultant.rating || defaultDoctorData.rating,
      experience: selectedConsultant.experience || defaultDoctorData.experience,
      languages: selectedConsultant.languages || defaultDoctorData.languages,
      education: selectedConsultant.education || defaultDoctorData.education,
      price: selectedConsultant.price || defaultDoctorData.price,
      id: selectedConsultant.id
  } : defaultDoctorData;

  // Fetch reviews with pagination
  const fetchConsultantReviews = useCallback(async (page = 1, append = false) => {
      if (!selectedConsultant?.id) {
          setIsLoadingReviews(false);
          return;
      }
      
      try {
          if (page === 1 && !append) {
              setIsLoadingReviews(true);
          } else {
              setIsLoadingMore(true);
          }

          const response = await getConsultantReviewsPaginated(
              selectedConsultant.id,
              page,
              REVIEWS_PER_PAGE,
              sortBy,
              sortOrder
          );
          
          if (response.success) {
              const newReviews = response.reviews || [];
              
              if (append && page > 1) {
                  setReviews(prev => [...prev, ...newReviews]);
              } else {
                  setReviews(newReviews);
              }
              
              // Update pagination info
              setCurrentPage(response.pagination.current_page);
              setTotalPages(response.pagination.total_pages);
              setTotalReviews(response.pagination.total_reviews);
              setHasNextPage(response.pagination.has_next);
              
              // Update average rating
              if (response.statistics && response.statistics.average_rating) {
                  setAverageRating(parseFloat(response.statistics.average_rating));
              }
          } else {
              console.error('Failed to fetch reviews:', response.message);
              if (page === 1) {
                  Alert.alert('Error', 'Failed to load reviews');
              }
          }
      } catch (error) {
          console.error('Error fetching reviews:', error);
          if (page === 1) {
              Alert.alert('Error', 'Failed to load reviews');
          }
      } finally {
          setIsLoadingReviews(false);
          setIsLoadingMore(false);
          setIsRefreshing(false);
      }
  }, [selectedConsultant?.id, sortBy, sortOrder]);

  // Load more reviews
  const loadMoreReviews = useCallback(() => {
      if (!isLoadingMore && hasNextPage && currentPage < totalPages) {
          fetchConsultantReviews(currentPage + 1, true);
      }
  }, [isLoadingMore, hasNextPage, currentPage, totalPages, fetchConsultantReviews]);

  // Refresh reviews
  const refreshReviews = useCallback(() => {
      setIsRefreshing(true);
      setCurrentPage(1);
      fetchConsultantReviews(1, false);
  }, [fetchConsultantReviews]);

  // Change sorting
  const changeSorting = useCallback((newSortBy, newSortOrder) => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      setCurrentPage(1);
      setReviews([]);
  }, []);

  // Submit a new review
  const handleSubmitReview = async () => {
      if (!selectedConsultant?.id) {
          Alert.alert('Error', 'No consultant selected');
          return;
      }

      if (reviewText.trim().length < 10) {
          Alert.alert('Error', 'Please write a review with at least 10 characters');
          return;
      }

      try {
          setIsSubmittingReview(true);
          const response = await submitReview(selectedConsultant.id, {
              rating: Number(reviewRating),
              review_text: reviewText.trim()
          });

          if (response.success) {
              Alert.alert('Success', 'Review submitted successfully');
              setShowReviewModal(false);
              setReviewText('');
              setReviewRating(5);
              // Refresh reviews from the beginning
              refreshReviews();
          } else {
              Alert.alert('Error', response.message || 'Failed to submit review');
          }
      } catch (error) {
          console.error('Error submitting review:', error);
          <ToastMessage />
          // Alert.alert('Error', 'Failed to submit review');
      } finally {
          setIsSubmittingReview(false);
      }
  };

  // Format date for display
  const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
      });
  };

  // Render star rating
  const renderStars = (rating, onPress = null, size = 20) => {
      const stars = [];
      for (let i = 1; i <= 5; i++) {
          stars.push(
              <TouchableOpacity
                  key={i}
                  onPress={() => onPress && onPress(i)}
                  disabled={!onPress}
              >
                  <Ionicons
                      name={i <= rating ? "star" : "star-outline"}
                      size={size}
                      color="#FFD700"
                  />
              </TouchableOpacity>
          );
      }
      return <View style={styles.starsContainer}>{stars}</View>;
  };

  // Render sorting options
  const renderSortingOptions = () => (
      <View style={styles.sortingContainer}>
          <Text style={styles.sortingLabel}>Sort by:</Text>
          <View style={styles.sortingButtons}>
              <TouchableOpacity
                  style={[
                      styles.sortButton,
                      sortBy === 'created_at' && sortOrder === 'DESC' && styles.activeSortButton
                  ]}
                  onPress={() => changeSorting('created_at', 'DESC')}
              >
                  <Text style={[
                      styles.sortButtonText,
                      sortBy === 'created_at' && sortOrder === 'DESC' && styles.activeSortButtonText
                  ]}>Newest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                  style={[
                      styles.sortButton,
                      sortBy === 'created_at' && sortOrder === 'ASC' && styles.activeSortButton
                  ]}
                  onPress={() => changeSorting('created_at', 'ASC')}
              >
                  <Text style={[
                      styles.sortButtonText,
                      sortBy === 'created_at' && sortOrder === 'ASC' && styles.activeSortButtonText
                  ]}>Oldest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                  style={[
                      styles.sortButton,
                      sortBy === 'rating' && sortOrder === 'DESC' && styles.activeSortButton
                  ]}
                  onPress={() => changeSorting('rating', 'DESC')}
              >
                  <Text style={[
                      styles.sortButtonText,
                      sortBy === 'rating' && sortOrder === 'DESC' && styles.activeSortButtonText
                  ]}>Highest Rating</Text>
              </TouchableOpacity>
              <TouchableOpacity
                  style={[
                      styles.sortButton,
                      sortBy === 'rating' && sortOrder === 'ASC' && styles.activeSortButton
                  ]}
                  onPress={() => changeSorting('rating', 'ASC')}
              >
                  <Text style={[
                      styles.sortButtonText,
                      sortBy === 'rating' && sortOrder === 'ASC' && styles.activeSortButtonText
                  ]}>Lowest Rating</Text>
              </TouchableOpacity>
          </View>
      </View>
  );

  // Render individual review item
  const renderReviewItem = ({ item: review, index }) => (
      <View key={review.id || index} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
              <View style={styles.reviewerInfo}>
                  <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitial}>
                          {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'U'}
                      </Text>
                  </View>
                  <View>
                      <Text style={styles.reviewerName}>
                          {review.user_name || 'Anonymous User'}
                      </Text>
                      <Text style={styles.reviewDate}>
                          {formatDate(review.created_at)}
                      </Text>
                  </View>
              </View>
              {renderStars(review.rating, null, 16)}
          </View>
          {review.review_text && (
              <Text style={styles.reviewText}>{review.review_text}</Text>
          )}
      </View>
  );

  // Render footer component for FlatList
  const renderFooter = () => {
      if (!isLoadingMore) return null;
      return (
          <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingMoreText}>Loading more reviews...</Text>
          </View>
      );
  };

  // Display rating - use server average if available, otherwise fallback
  const displayRating = averageRating > 0 ? averageRating.toFixed(1) : consultantData.rating;

  useEffect(() => {
      fetchConsultantReviews(1, false);
  }, [fetchConsultantReviews]);

  const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: COLORS.background,
  },
  header: {
      backgroundColor: COLORS.gradientStart,
      paddingTop: 50,
      paddingBottom: 40,
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
      shadowColor: COLORS.gradientStart,
      shadowOffset: {
          width: 0,
          height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
  },
  headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
  },
  backButton: {
      padding: 8,
  },
  headerTitle: {
      color: COLORS.white,
      fontSize: 20,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 20,
  },
  headerActions: {
      flexDirection: 'row',
      gap: 8,
  },
  actionButton: {
      padding: 8,
  },
  scrollView: {
      flex: 1,
      backgroundColor: COLORS.background,
  },
  profileCard: {
      backgroundColor: COLORS.background,
      alignItems: 'center',
      paddingTop: 30,
      paddingBottom: 20,
      marginTop: -20,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
  },
  profileImageContainer: {
      position: 'relative',
      marginBottom: 16,
  },
  profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 4,
      borderColor: COLORS.white,
  },
  ratingBadge: {
      position: 'absolute',
      bottom: -5,
      right: -5,
      backgroundColor: COLORS.cardBackground,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      shadowColor: '#000',
      shadowOffset: {
          width: 0,
          height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
  },
  ratingText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textDark,
  },
  doctorName: {
      fontSize: 24,
      fontWeight: '700',
      color: COLORS.textDark,
      marginBottom: 4,
  },
  doctorSpecialty: {
      fontSize: 16,
      color: COLORS.textSecondary,
      marginBottom: 8,
  },
  infoContainer: {
      backgroundColor: COLORS.background,
      paddingHorizontal: 24,
      paddingVertical: 16,
  },
  infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGrey,
  },
  infoLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textDark,
      flex: 1,
  },
  infoValue: {
      fontSize: 16,
      color: COLORS.textSecondary,
      flex: 2,
      textAlign: 'right',
  },
  reviewsContainer: {
    //   backgroundColor: COLORS.backgroun,
      paddingHorizontal: 24,
      paddingVertical: 24,
  },
  reviewsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: COLORS.textDark,
  },
  writeReviewButton: {
      backgroundColor: COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
  },
  writeReviewText: {
      color: COLORS.white,
      fontSize: 14,
      fontWeight: '600',
  },
  overallRating: {
      alignItems: 'center',
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGrey,
      marginBottom: 20,
  },
  ratingNumber: {
      fontSize: 48,
      fontWeight: '700',
      color: COLORS.textDark,
      marginBottom: 8,
  },
  starsContainer: {
      flexDirection: 'row',
      gap: 4,
      marginBottom: 8,
  },
  ratingCount: {
      fontSize: 14,
      color: COLORS.textSecondary,
  },
  // Sorting Styles
  sortingContainer: {
      marginBottom: 20,
  },
  sortingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textDark,
      marginBottom: 12,
  },
  sortingButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
  },
  sortButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: COLORS.lightGrey,
      borderWidth: 1,
      borderColor: COLORS.lightGrey,
  },
  activeSortButton: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
  },
  sortButtonText: {
      fontSize: 12,
      color: COLORS.textSecondary,
      fontWeight: '500',
  },
  activeSortButtonText: {
      color: COLORS.white,
      fontWeight: '600',
  },
  loadingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
  },
  loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: COLORS.textSecondary,
  },
  loadingMoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      gap: 8,
  },
  loadingMoreText: {
      fontSize: 14,
      color: COLORS.textSecondary,
  },
  reviewCard: {
      backgroundColor: COLORS.Background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
  },
  reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
  },
  reviewerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  reviewerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
  },
  reviewerInitial: {
      color: COLORS.white,
      fontSize: 18,
      fontWeight: '600',
  },
  reviewerName: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textDark,
  },
  reviewDate: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginTop: 2,
  },
  reviewText: {
      fontSize: 14,
      color: COLORS.textDark,
      lineHeight: 20,
  },
  noReviewsContainer: {
      alignItems: 'center',
      paddingVertical: 40,
  },
  noReviewsText: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.textSecondary,
      marginTop: 16,
  },
  noReviewsSubtext: {
      fontSize: 14,
      color: COLORS.textSecondary,
      marginTop: 4,
  },
  bottomPadding: {
      height: 40,
  },
  // Modal Styles
  modalContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGrey,
  },
  modalCancelText: {
      fontSize: 16,
      color: COLORS.textSecondary,
  },
  modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.textDark,
  },
  modalSubmitText: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.primary,
  },
  disabledText: {
      color: COLORS.textSecondary,
  },
  modalContent: {
      flex: 1,
      paddingHorizontal: 20,
  },
  doctorPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 20,
      gap: 12,
  },
  doctorPreviewImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
  },
  doctorPreviewName: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.textDark,
  },
  doctorPreviewSpecialty: {
      fontSize: 14,
      color: COLORS.textSecondary,
      marginTop: 2,
  },
  ratingSection: {
      paddingVertical: 20,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGrey,
  },
  ratingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textDark,
      marginBottom: 16,
  },
  reviewTextSection: {
      paddingTop: 20,
  },
  reviewTextLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textDark,
      marginBottom: 12,
  },
  reviewTextInput: {
      borderWidth: 1,
      borderColor: COLORS.lightGrey,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      textAlignVertical: 'top',
      minHeight: 120,
  },
  characterCount: {
      fontSize: 12,
      color: COLORS.textSecondary,
      textAlign: 'right',
      marginTop: 8,
  },
});

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.gradientStart} />
        
      {/* Header with Gradient Background */}
      <View style={styles.header}>
          <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Doctor Details</Text>
              <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => setIsFavorite(!isFavorite)}>
                      <Ionicons 
                          name={isFavorite ? "heart" : "heart-outline"} 
                          size={24} 
                          color={isFavorite ? "#FF6B6B" : COLORS.white} 
                      />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="share-outline" size={24} color={COLORS.white} />
                  </TouchableOpacity>
              </View>
          </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Doctor Profile Card */}
        <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
                <Image 
                    source={{ uri: consultantData.profilePicture }}
                    style={styles.profileImage}
                />
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{displayRating}</Text>
                </View>
            </View>
            
            <Text style={styles.doctorName}>{consultantData.name}</Text>
            <Text style={styles.doctorSpecialty}>{consultantData.specialty}</Text>
        </View>

        {/* Doctor Information */}
        <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Experience:</Text>
                <Text style={styles.infoValue}>{consultantData.experience}</Text>
            </View>
            
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Languages:</Text>
                <Text style={styles.infoValue}>{consultantData.languages.join(", ")}</Text>
            </View>
            
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Education:</Text>
                <Text style={styles.infoValue}>{consultantData.education}</Text>
            </View>

            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Consultation Fee:</Text>
                <Text style={styles.infoValue}>${consultantData.price}</Text>
            </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsContainer}>
            <View style={styles.reviewsHeader}>
                <Text style={styles.sectionTitle}>
                    Reviews ({totalReviews})
                </Text>
                <TouchableOpacity 
                    style={styles.writeReviewButton}
                    onPress={() => setShowReviewModal(true)}
                >
                    <Ionicons name="add" size={20} color={COLORS.white} />
                    <Text style={styles.writeReviewText}>Write Review</Text>
                </TouchableOpacity>
            </View>

            {/* Overall Rating */}
            {totalReviews > 0 && (
                <View style={styles.overallRating}>
                    <Text style={styles.ratingNumber}>{displayRating}</Text>
                    {renderStars(Math.round(displayRating), null, 24)}
                    <Text style={styles.ratingCount}>Based on {totalReviews} reviews</Text>
                </View>
            )}

            {/* Sorting Options */}
            {totalReviews > 1 && renderSortingOptions()}

            {/* Reviews List */}
            {isLoadingReviews ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading reviews...</Text>
                </View>
            ) : reviews.length > 0 ? (
                <FlatList
                    data={reviews}
                    renderItem={renderReviewItem}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    onEndReached={loadMoreReviews}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={renderFooter}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={refreshReviews}
                            colors={[COLORS.primary]}
                        />
                    }
                    scrollEnabled={false}
                    nestedScrollEnabled={true}
                />
            ) : (
                <View style={styles.noReviewsContainer}>
                    <Ionicons name="chatbubble-outline" size={50} color={COLORS.textSecondary} />
                    <Text style={styles.noReviewsText}>No reviews yet</Text>
                    <Text style={styles.noReviewsSubtext}>Be the first to share your experience</Text>
                </View>
            )}
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Review Modal */}
      <Modal
          visible={showReviewModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowReviewModal(false)}
      >
          <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                      <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Write Review</Text>
                  <TouchableOpacity 
                      onPress={handleSubmitReview}
                      disabled={isSubmittingReview}
                  >
                      <Text style={[
                          styles.modalSubmitText,
                          isSubmittingReview && styles.disabledText
                      ]}>
                          {isSubmittingReview ? 'Submitting...' : 'Submit'}
                      </Text>
                  </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                  <View style={styles.doctorPreview}>
                      <Image 
                          source={{ uri: consultantData.profilePicture }}
                          style={styles.doctorPreviewImage}
                      />
                      <View>
                          <Text style={styles.doctorPreviewName}>{consultantData.name}</Text>
                          <Text style={styles.doctorPreviewSpecialty}>{consultantData.specialty}</Text>
                      </View>
                  </View>

                  <View style={styles.ratingSection}>
                      <Text style={styles.ratingLabel}>Rating</Text>
                      {renderStars(reviewRating, setReviewRating, 30)}
                  </View>

                  <View style={styles.reviewTextSection}>
                      <Text style={styles.reviewTextLabel}>Review (Optional)</Text>
                      <TextInput
                          style={styles.reviewTextInput}
                          multiline
                          numberOfLines={4}
                          placeholder="Share your experience with this doctor..."
                          value={reviewText}
                          onChangeText={setReviewText}
                          maxLength={500}
                      />
                      <Text style={styles.characterCount}>
                          {reviewText.length}/500 characters
                      </Text>
                  </View>
              </ScrollView>
          </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
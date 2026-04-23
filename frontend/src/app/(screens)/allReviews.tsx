import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';
import { getConsultantReviewsPaginated } from '../../services/api';
import { useRouter } from 'expo-router';

interface Review {
  id: string | number;
  user_name?: string;
  user_profile_image?: string;
  rating: number;
  review_text?: string;
  created_at: string;
}

const AllReviewsScreen = () => {
  const { user } = useAuth();
  const { COLORS } = useTheme();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate overall rating and total reviews
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
    : 0;
  // Calculate distribution (1-5 stars)
  const ratingDistribution = [5,4,3,2,1].map(star => ({
    stars: star,
    count: reviews.filter((r) => r.rating === star).length
  }));

  useEffect(() => {
    fetchReviews(1, true);
  }, [user?.id]);

  const fetchReviews = async (pageNum = 1, initial = false) => {
    if (!user?.id) return;
    if (!initial && !hasMore) return;
    if (initial) setLoading(true);
    try {
      const result = await getConsultantReviewsPaginated(user.id, pageNum, 20, 'created_at', 'DESC');
      if (result.success && result.reviews) {
        setReviews(pageNum === 1 ? result.reviews : prev => [...prev, ...result.reviews]);
        setHasMore(result.reviews.length === 20);
        setPage(pageNum);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchReviews(page + 1);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews(1, true);
  };

  const handleGoBack = () => {
    router.back();
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image source={{ uri: item.user_profile_image }} style={styles.avatar} />
        <View style={styles.reviewInfo}>
          <Text style={styles.userName}>{item.user_name}</Text>
          <View style={styles.ratingRow}>
            {[1,2,3,4,5].map(star => (
              <Ionicons
                key={star}
                name="star"
                size={16}
                color={star <= item.rating ? '#FFD700' : '#E0E0E0'}
              />
            ))}
            <Text style={styles.ratingValue}>{item.rating}</Text>
          </View>
        </View>
        <Text style={styles.reviewDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.reviewText}>{item.review_text}</Text>
    </View>
  );

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
  },
  ratingLeft: {
    alignItems: 'flex-start',
  },
  averageRating: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 4,
  },
  totalReviews: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  ratingRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  starLabel: {
    color: COLORS.textDark,
    fontWeight: '500',
    fontSize: 14,
    width: 30,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.lightGrey,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  ratingCount: {
    color: COLORS.textDark,
    fontWeight: '500',
    fontSize: 14,
    width: 40,
    textAlign: 'right',
  },
  reviewCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  reviewInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    color: COLORS.textDark,
    fontSize: 15,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingValue: {
    marginLeft: 6,
    color: COLORS.textDark,
    fontWeight: '500',
    fontSize: 13,
  },
  reviewDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  reviewText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
});

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>All Reviews & Ratings</Text>
          <Text style={styles.headerSubtitle}>See what patients are saying</Text>
        </View>
      </View>
      {/* Overall Rating Overview (dashboard style) */}
      <View style={styles.ratingOverview}>
        <View style={styles.ratingLeft}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons 
                key={star} 
                name="star" 
                size={20} 
                color={star <= Math.floor(averageRating) ? "#FFD700" : "#E0E0E0"} 
              />
            ))}
          </View>
          <Text style={styles.totalReviews}>{totalReviews} reviews</Text>
        </View>
        <View style={styles.ratingRight}>
          {ratingDistribution.map((rating, index) => (
            <View key={index} style={styles.ratingRow}>
              <Text style={styles.starLabel}>{rating.stars}★</Text>
              <View style={styles.ratingBarContainer}>
                <View 
                  style={[
                    styles.ratingBarFill, 
                    { width: `${(totalReviews ? (rating.count / totalReviews) * 100 : 0)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.ratingCount}>{rating.count}</Text>
            </View>
          ))}
        </View>
      </View>
      {/* List */}
      {loading && page === 1 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReview}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 16 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No reviews yet.</Text>}
        />
      )}
    </View>
  );
};

export default AllReviewsScreen;

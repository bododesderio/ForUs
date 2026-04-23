import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import React, { useCallback, useState } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { data, FeedType } from '../data/feed-data';

const CommunityFeedContent = () => {
    const [feedPosts, setFeedPosts] = useState<FeedType[]>(data);
    const { COLORS } = useTheme();

    const handleLikePost = useCallback((postId:number) => {
        setFeedPosts(prevPosts => 
        prevPosts.map(post => 
            post.id === postId 
            ? { 
                ...post, 
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes - 1 : post.likes + 1
                }
            : post
        )
        );
    }, []);

    const handleRepostPost = useCallback((postId: number) => {
        setFeedPosts(prevPosts => 
        prevPosts.map(post => 
            post.id === postId 
            ? { 
                ...post, 
                isReposted: !post.isReposted,
                reposts: post.isReposted ? post.reposts - 1 : post.reposts + 1
                }
            : post
        )
        );
    }, []);

    const formatNumber = useCallback((num: number) => {
        if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }, []);

    const styles = StyleSheet.create({
    feedContainer: {
        gap: 16,
    },
    feedPost: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
        width: 0,
        height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
        borderWidth: 1,
        borderColor: COLORS.border || '#E0E0E0',
    },
    postHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    userHandle: {
        fontSize: 14,
        color: COLORS.grey,
        marginTop: 2,
    },
    postContent: {
        fontSize: 15,
        lineHeight: 22,
        color: COLORS.textDark,
        marginBottom: 12,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
    },
    postActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border || '#F0F0F0',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    actionText: {
        fontSize: 14,
        color: COLORS.grey,
        marginLeft: 4,
    },
    likedText: {
        color: '#FF4444',
    },
    repostedText: {
        color: '#50C878',
    },
})

    return (
        <View style={styles.feedContainer}>
        {feedPosts.map((post) => (
            <View key={post.id} style={styles.feedPost}>
            <View style={styles.postHeader}>
                <Image
                style={styles.userAvatar}
                source={{ uri: post.user.avatar }}
                />
                <View style={styles.userInfo}>
                <Text style={styles.userName}>{post.user.name}</Text>
                <Text style={styles.userHandle}>{post.user.username} • {post.timestamp}</Text>
                </View>
            </View>

            <Text style={styles.postContent}>{post.content}</Text>

            {post.image && (
                <Image
                style={styles.postImage}
                source={{ uri: post.image }}
                />
            )}

            <View style={styles.postActions}>
                <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleLikePost(post.id)}
                >
                <Ionicons 
                    name={post.isLiked ? "heart" : "heart-outline"} 
                    size={20} 
                    color={post.isLiked ? "#FF4444" : COLORS.grey} 
                />
                <Text style={[styles.actionText, post.isLiked && styles.likedText]}>
                    {formatNumber(post.likes)}
                </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleRepostPost(post.id)}
                >
                <Ionicons 
                    name={post.isReposted ? "repeat" : "repeat-outline"} 
                    size={20} 
                    color={post.isReposted ? "#50C878" : COLORS.grey} 
                />
                <Text style={[styles.actionText, post.isReposted && styles.repostedText]}>
                    {formatNumber(post.reposts)}
                </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={20} color={COLORS.grey} />
                <Text style={styles.actionText}>Reply</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-outline" size={20} color={COLORS.grey} />
                </TouchableOpacity>
            </View>
            </View>
        ))}
        </View>
    );
}

export default CommunityFeedContent;
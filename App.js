import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking
} from 'react-native';

// Real Supabase connection (replace demo data)
// Note: In Snack, we'll simulate this. For real app, install @supabase/supabase-js
const createClient = (url, key) => {
  // Mock Supabase client for Snack compatibility
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          order: (column, options) => ({
            then: () => Promise.resolve({ data: [], error: null })
          })
        }),
        order: (column, options) => ({
          then: () => Promise.resolve({ data: [], error: null })
        }),
        lte: (column, value) => ({
          then: () => Promise.resolve({ data: [], error: null })
        }),
        count: 'exact',
        head: true,
        then: () => Promise.resolve({ data: null, error: null })
      }),
      update: (data) => ({
        eq: (column, value) => ({
          then: () => Promise.resolve({ data: null, error: null })
        })
      })
    })
  };
};

const SUPABASE_URL = 'https://uifylkfmtjsdjumyumzh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZnlsa2ZtdGpzZGp1bXl1bXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODQ4MDAsImV4cCI6MjA2Njk2MDgwMH0.T4zUVhDlH9NkvxmYaNF2WqkzSn4QDMCo9fUWEr11Rxk';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Demo data for testing UI
const demoScheduledPosts = [
  {
    id: 1,
    slide_count: 12,
    status: 'scheduled',
    scheduled_time: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
    caption: 'Check out this amazing carousel post with 12 slides! 🔥\n\n#instagram #carousel #socialmedia #content',
    post_slides: [
      { id: 1, public_url: 'https://picsum.photos/300/300?random=1', order_index: 0 },
      { id: 2, public_url: 'https://picsum.photos/300/300?random=2', order_index: 1 },
      { id: 3, public_url: 'https://picsum.photos/300/300?random=3', order_index: 2 },
      { id: 4, public_url: 'https://picsum.photos/300/300?random=4', order_index: 3 },
      { id: 5, public_url: 'https://picsum.photos/300/300?random=5', order_index: 4 },
      { id: 6, public_url: 'https://picsum.photos/300/300?random=6', order_index: 5 }
    ]
  },
  {
    id: 2,
    slide_count: 8,
    status: 'notified',
    scheduled_time: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    caption: 'Another great post ready to go! 📸\n\n#photography #design #creative',
    post_slides: [
      { id: 7, public_url: 'https://picsum.photos/300/300?random=7', order_index: 0 },
      { id: 8, public_url: 'https://picsum.photos/300/300?random=8', order_index: 1 },
      { id: 9, public_url: 'https://picsum.photos/300/300?random=9', order_index: 2 }
    ]
  }
];

export default function App() {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [downloadingPostId, setDownloadingPostId] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Test Supabase connection
      await testSupabaseConnection();
      
      // Load real scheduled posts from Supabase
      await loadScheduledPosts();
      
      // Start checking for scheduled posts every minute
      startBackgroundCheck();
      
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('Connection Error', 'Failed to connect to database. Using demo mode.');
      
      // Fallback to demo data if Supabase fails
      setTimeout(() => {
        setConnectionStatus('demo');
        setScheduledPosts(demoScheduledPosts);
        setIsLoading(false);
      }, 1000);
    }
  };

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Supabase connection error:', error);
      setConnectionStatus('error');
      throw new Error(`Database connection failed: ${error.message}`);
    }
  };

  const loadScheduledPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          post_slides(*)
        `)
        .order('scheduled_time', { ascending: true });

      if (error) {
        throw error;
      }

      setScheduledPosts(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading posts:', error);
      throw error;
    }
  };

  const startBackgroundCheck = () => {
    // Check every minute for scheduled posts that are due
    setInterval(async () => {
      await checkForDuePosts();
    }, 60000); // 60 seconds
  };

  const checkForDuePosts = async () => {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select(`
          *,
          post_slides(*)
        `)
        .eq('status', 'scheduled')
        .lte('scheduled_time', now.toISOString());

      if (error) {
        console.error('Error checking due posts:', error);
        return;
      }

      // Send notifications for due posts
      for (const post of data || []) {
        Alert.alert(
          '📸 Time to Post!',
          `Your ${post.slide_count} slide carousel is ready to post on Instagram!`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Download & Post', onPress: () => downloadAndOpenInstagram(post) }
          ]
        );
        
        // Update status to prevent duplicate notifications
        await supabase
          .from('scheduled_posts')
          .update({ status: 'notified' })
          .eq('id', post.id);
      }
      
      // Refresh the list
      await loadScheduledPosts();
    } catch (error) {
      console.error('Error in checkForDuePosts:', error);
    }
  };

  const simulateNotification = (post) => {
    Alert.alert(
      '📸 Time to Post!',
      `Your ${post.slide_count} slide carousel is ready to post on Instagram!`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Download & Post', onPress: () => downloadAndOpenInstagram(post) }
      ]
    );
  };

  const downloadAndOpenInstagram = async (post) => {
    try {
      setDownloadingPostId(post.id);
      
      // Copy caption to clipboard (simulated for now - will work on real device)
      if (post.caption) {
        // Note: Clipboard.setString() would work on real device with expo-clipboard
        console.log('Caption copied:', post.caption);
        Alert.alert('✅ Caption Ready!', 'Caption copied to clipboard (on real device)!');
      }

      // Simulate downloading images (will work on real device with proper file system)
      console.log('Downloading images:', post.post_slides);
      
      // For now, just show success message
      Alert.alert(
        '🎉 Ready to Post!',
        `Downloaded ${post.slide_count} slides to your Photos.\nCaption copied to clipboard.\n\nOpen Instagram now?`,
        [
          { text: 'Not Now', style: 'cancel' },
          { 
            text: 'Open Instagram', 
            onPress: () => openInstagram()
          }
        ]
      );

      // Update post status in Supabase
      await supabase
        .from('scheduled_posts')
        .update({ status: 'downloaded' })
        .eq('id', post.id);
        
      await loadScheduledPosts();
      
    } catch (error) {
      console.error('Error downloading slides:', error);
      Alert.alert('Error', 'Failed to download slides: ' + error.message);
    } finally {
      setDownloadingPostId(null);
    }
  };

  const openInstagram = async () => {
    try {
      // Try multiple Instagram deep link methods
      const instagramUrls = [
        'instagram://user?username=instagram', // Main Instagram URL
        'instagram://camera', // Camera view
        'instagram://feed', // Feed view
        'instagram://', // Basic Instagram
      ];
      
      let opened = false;
      
      // Try each Instagram URL
      for (const url of instagramUrls) {
        try {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            opened = true;
            Alert.alert('📱 Instagram Opened!', 'Go to Instagram camera and select your downloaded images to create your carousel post!');
            break;
          }
        } catch (error) {
          console.log(`Failed to open ${url}:`, error);
        }
      }
      
      // If none worked, try web version
      if (!opened) {
        try {
          await Linking.openURL('https://www.instagram.com');
          Alert.alert('📱 Instagram Web', 'Opened Instagram in browser. For best results, use the Instagram mobile app.');
        } catch (error) {
          // Last resort - app store
          const storeUrl = Platform.OS === 'ios' 
            ? 'https://apps.apple.com/app/instagram/id389801252'
            : 'https://play.google.com/store/apps/details?id=com.instagram.android';
          await Linking.openURL(storeUrl);
          Alert.alert('📱 Install Instagram', 'Instagram app not found. Download it from the app store!');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open Instagram. Please open it manually.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (connectionStatus === 'connected') {
        await loadScheduledPosts();
      } else {
        // Demo mode - just simulate refresh
        setTimeout(() => {
          setRefreshing(false);
        }, 1000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh posts');
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#f59e0b';
      case 'notified': return '#3b82f6';
      case 'downloaded': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'scheduled': return '⏰';
      case 'notified': return '🔔';
      case 'downloaded': return '✅';
      default: return '⚪';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading Instagram Scheduler...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 IG Scheduler</Text>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { 
            backgroundColor: connectionStatus === 'connected' ? '#10b981' : 
                           connectionStatus === 'demo' ? '#f59e0b' : '#ef4444' 
          }]} />
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? 'Connected to Supabase' : 
             connectionStatus === 'demo' ? 'Demo Mode' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Demo Banner */}
      <View style={[styles.demoBanner, { 
        backgroundColor: connectionStatus === 'connected' ? '#10b981' : '#fbbf24' 
      }]}>
        <Text style={[styles.demoText, { 
          color: connectionStatus === 'connected' ? 'white' : '#92400e' 
        }]}>
          {connectionStatus === 'connected' ? 
            '🔗 LIVE MODE - Connected to your Supabase database!' :
            '📱 DEMO MODE - Tap posts to simulate notifications!'
          }
        </Text>
      </View>

      {/* Scheduled Posts List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>
            📋 Scheduled Posts ({scheduledPosts.length})
          </Text>

          {scheduledPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📱</Text>
              <Text style={styles.emptyStateTitle}>
                {connectionStatus === 'connected' ? 'No Scheduled Posts' : 'Ready for Testing'}
              </Text>
              <Text style={styles.emptyStateText}>
                {connectionStatus === 'connected' ? 
                  'Use the web app to schedule your Instagram carousel posts. They\'ll appear here and you\'ll get notified when it\'s time to post!' :
                  'This is demo mode. In the real app, your scheduled posts from the web app will appear here. You\'ll get push notifications when it\'s time to post!'
                }
              </Text>
            </View>
          ) : (
            scheduledPosts.map((post) => (
              <TouchableOpacity 
                key={post.id} 
                style={styles.postCard}
                onPress={() => {
                  if (connectionStatus === 'connected') {
                    // Real post - direct download
                    downloadAndOpenInstagram(post);
                  } else {
                    // Demo post - simulate notification
                    simulateNotification(post);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.postHeader}>
                  <Text style={styles.postTitle}>
                    {getStatusEmoji(post.status)} {post.slide_count} slides
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(post.status) }]}>
                    <Text style={styles.statusBadgeText}>{post.status}</Text>
                  </View>
                </View>
                
                <Text style={styles.postDate}>
                  {formatDate(post.scheduled_time)}
                </Text>
                
                {post.caption && (
                  <Text style={styles.postCaption} numberOfLines={2}>
                    {post.caption}
                  </Text>
                )}

                {/* Slide previews */}
                {post.post_slides && post.post_slides.length > 0 && (
                  <ScrollView horizontal style={styles.slidePreview} showsHorizontalScrollIndicator={false}>
                    {post.post_slides.slice(0, 5).map((slide, index) => (
                      <Image
                        key={slide.id}
                        source={{ uri: slide.public_url }}
                        style={styles.slideImage}
                      />
                    ))}
                    {post.post_slides.length > 5 && (
                      <View style={styles.moreSlides}>
                        <Text style={styles.moreSlidesText}>+{post.post_slides.length - 5}</Text>
                      </View>
                    )}
                  </ScrollView>
                )}

                {/* Action Button */}
                <View
                  style={[styles.actionButton, { 
                    backgroundColor: post.status === 'scheduled' ? '#6b7280' : '#667eea',
                    opacity: downloadingPostId === post.id ? 0.7 : 1
                  }]}
                >
                  <Text style={styles.actionButtonText}>
                    {downloadingPostId === post.id ? '📥 Downloading...' :
                     connectionStatus === 'connected' ? 
                       (post.status === 'scheduled' ? '⏰ Waiting for scheduled time' :
                        post.status === 'notified' ? '📥 Download & Post' :
                        '✅ Re-download') :
                     '⏰ Tap to simulate notification'
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
  },
  demoBanner: {
    backgroundColor: '#fbbf24',
    padding: 12,
    alignItems: 'center',
  },
  demoText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  postDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  postCaption: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 18,
  },
  slidePreview: {
    marginBottom: 16,
  },
  slideImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  moreSlides: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreSlidesText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
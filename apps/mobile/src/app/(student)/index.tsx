import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Stethoscope,
  Flame,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  BookOpen,
  RefreshCw,
  Clock,
  Award
} from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth-store';
import api from '../../lib/api';
import { ThemedText } from '@/components/themed-text';

const { width } = Dimensions.get('window');

interface OverallStats {
  total_answered: number;
  correct_count: number;
  incorrect_count: number;
  accuracy_percentage: number;
  weak_points_count: number;
  rank?: number | null;
}

interface CategoryProgress {
  category_id: number;
  category_name: string;
  category_icon: string;
  total_questions: number;
  answered_count: number;
  correct_count: number;
  accuracy_percentage: number;
  strongest_subcategory?: string | null;
  weakest_subcategory?: string | null;
}

interface RecentSession {
  session_id: string;
  category_name: string;
  mode: string;
  total_questions: number;
  score_percentage: number;
  created_at: string;
  quiz_name?: string | null;
  status: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Analytics states
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [categories, setCategories] = useState<CategoryProgress[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  // Parse user's first name for header
  const getFirstName = () => {
    if (!user?.full_name) return 'Doctor';
    const cleanName = user.full_name.replace(/^(dr\.|dr)\s+/i, '');
    return cleanName.split(' ')[0] || 'Doctor';
  };

  const fetchDashboardData = async () => {
    try {
      setErrorMsg(null);

      // 1. Fetch Analytics data
      const analyticsRes = await api.get('/analytics/me');
      const { overall: oStats, categories: cStats, recent_sessions: rSessions } = analyticsRes.data;

      setOverall(oStats);
      setCategories(cStats || []);
      setRecentSessions(rSessions || []);

      // 2. Fetch User Profile to refresh current streak
      const profileRes = await api.get('/auth/me');
      if (profileRes.data) {
        updateUser(profileRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to sync dashboard data with server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald[500]} />
          <ThemedText style={styles.syncText} type="small">Syncing your clinical progress...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg && !overall) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <AlertTriangle color={Colors.rose[500]} size={48} />
          <ThemedText style={styles.errorTitle} type="subtitle">Sync Error</ThemedText>
          <ThemedText style={styles.errorDesc} type="default">{errorMsg}</ThemedText>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchDashboardData(); }}>
            <RefreshCw color="#ffffff" size={16} />
            <ThemedText style={{ color: '#ffffff' }} type="smallBold">Retry Sync</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Welcome & Streak Header */}
      <View style={styles.header}>
        <View style={styles.headerWelcome}>
          <View style={styles.stethoscopeBadge}>
            <Stethoscope color="#ffffff" size={20} />
          </View>
          <View>
            <ThemedText style={styles.welcomeSub} type="small">Welcome back,</ThemedText>
            <ThemedText style={styles.welcomeTitle} type="smallBold">Dr. {getFirstName()}</ThemedText>
          </View>
        </View>

        {/* Streak Flame */}
        <View style={styles.streakBadge}>
          <Flame color={Colors.orange[400]} size={18} fill={Colors.orange[400]} />
          <ThemedText style={styles.streakText} type="smallBold">
            {user?.current_streak || 0}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.emerald[500]}
            colors={[Colors.emerald[500]]}
            progressBackgroundColor="#0f172a"
          />
        }
      >
        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Answered */}
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
              <CheckCircle color={Colors.emerald[500]} size={20} />
            </View>
            <ThemedText style={styles.statLabel} type="small">Answered</ThemedText>
            <ThemedText style={styles.statValue} type="subtitle">
              {overall?.total_answered || 0}
            </ThemedText>
            <ThemedText style={styles.statSubText} type="small">
              {overall?.correct_count || 0} Correct
            </ThemedText>
          </View>

          {/* Card 2: Overall Accuracy */}
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(251, 146, 60, 0.08)' }]}>
              <Award color={Colors.orange[400]} size={20} />
            </View>
            <ThemedText style={styles.statLabel} type="small">Accuracy</ThemedText>
            <ThemedText style={styles.statValue} type="subtitle">
              {overall?.accuracy_percentage !== undefined ? `${overall.accuracy_percentage.toFixed(0)}%` : '0%'}
            </ThemedText>
            {/* Visual accuracy mini bar */}
            <View style={styles.miniProgressBarOuter}>
              <View style={[
                styles.miniProgressBarInner,
                { width: `${overall?.accuracy_percentage || 0}%` }
              ]} />
            </View>
          </View>

          {/* Card 3: Weak Points */}
          <View style={[styles.statCard, { width: '100%', flexDirection: 'row', alignItems: 'center', height: 90 }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(244, 63, 94, 0.08)', marginRight: 16 }]}>
              <AlertTriangle color={Colors.rose[500]} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.statLabel} type="small">Identified Weak Points</ThemedText>
              <ThemedText style={styles.statValue} type="subtitle">
                {overall?.weak_points_count || 0}
              </ThemedText>
            </View>
            <TouchableOpacity 
              style={styles.weakPointsAction}
              onPress={() => router.push('/(student)/study')}
            >
              <ChevronRight color={Colors.rose[500]} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Recent Activity */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle} type="smallBold">Recent Quiz Activity</ThemedText>
        </View>

        {recentSessions.length === 0 ? (
          <View style={styles.emptyActivityCard}>
            <Clock color={Colors.slate[400]} size={24} style={{ marginBottom: 8 }} />
            <ThemedText style={{ color: Colors.slate[400], textAlign: 'center' }} type="small">
              No recent quizzes recorded.{'\n'}Go to the Study Hub to create one!
            </ThemedText>
          </View>
        ) : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recentSessions}
            keyExtractor={(item) => item.session_id}
            renderItem={({ item }) => (
              <View style={styles.recentSessionCard}>
                <View style={styles.recentSessionTop}>
                  <ThemedText style={styles.recentCategoryName} type="smallBold" numberOfLines={1}>
                    {item.category_name}
                  </ThemedText>
                  <View style={[
                    styles.scoreBadge,
                    { backgroundColor: item.score_percentage >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 146, 60, 0.1)' }
                  ]}>
                    <ThemedText style={[
                      styles.scoreBadgeText,
                      { color: item.score_percentage >= 70 ? Colors.emerald[400] : Colors.orange[400] }
                    ]} type="smallBold">
                      {item.score_percentage.toFixed(0)}%
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.recentSessionFooter}>
                  <Clock color={Colors.slate[400]} size={12} style={{ marginRight: 4 }} />
                  <ThemedText style={styles.recentSessionDate} type="small">
                    {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </ThemedText>
                  <ThemedText style={styles.recentSessionMode} type="small">
                    • {item.mode === 'study' ? 'Study' : 'Test'}
                  </ThemedText>
                </View>
              </View>
            )}
            contentContainerStyle={styles.horizontalListContent}
          />
        )}

        {/* Section: Module Category Progress */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle} type="smallBold">Medical Specialities Progress</ThemedText>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyActivityCard}>
            <BookOpen color={Colors.slate[400]} size={24} style={{ marginBottom: 8 }} />
            <ThemedText style={{ color: Colors.slate[400], textAlign: 'center' }} type="small">
              No active syllabus modules available.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.categoriesList}>
            {categories.map((item) => {
              const progressPercentage = item.total_questions > 0 
                ? (item.answered_count / item.total_questions) * 100 
                : 0;

              return (
                <View key={item.category_id} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryIconBackground}>
                        <BookOpen color={Colors.emerald[500]} size={16} />
                      </View>
                      <ThemedText style={styles.categoryCardName} type="smallBold">
                        {item.category_name}
                      </ThemedText>
                    </View>
                    
                    <ThemedText style={styles.categoryCountText} type="small">
                      {item.answered_count} / {item.total_questions} Qs
                    </ThemedText>
                  </View>

                  {/* Category Progress Bar */}
                  <View style={styles.categoryProgressOuter}>
                    <View style={[
                      styles.categoryProgressInner,
                      { width: `${progressPercentage}%` }
                    ]} />
                  </View>

                  {/* Strongest / Weakest tags */}
                  <View style={styles.categorySubStats}>
                    <ThemedText style={styles.categoryAccuracy} type="small">
                      Avg. Accuracy: <ThemedText style={{ color: Colors.emerald[400], fontWeight: '700' }} type="small">
                        {item.accuracy_percentage.toFixed(0)}%
                      </ThemedText>
                    </ThemedText>

                    {item.weakest_subcategory && (
                      <View style={styles.weakSubBadge}>
                        <ThemedText style={styles.weakSubText} type="small">
                          Needs Review
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // navy-950
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  syncText: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    color: '#ffffff',
    fontWeight: '800',
  },
  errorDesc: {
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.emerald[500],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  /* Welcome header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b', // navy-800
    backgroundColor: '#020617',
  },
  headerWelcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stethoscopeBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeSub: {
    color: '#94a3b8',
    lineHeight: 14,
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 18,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  streakText: {
    color: Colors.orange[400],
  },
  /* Scroll content */
  scrollContent: {
    paddingBottom: 40,
  },
  /* Stats grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#0f172a', // navy-900 glass
    borderWidth: 1,
    borderColor: '#1e293b', // navy-800
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  statSubText: {
    color: '#64748b',
    fontSize: 12,
  },
  miniProgressBarOuter: {
    height: 4,
    backgroundColor: '#020617',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  miniProgressBarInner: {
    height: '100%',
    backgroundColor: Colors.orange[400],
    borderRadius: 2,
  },
  weakPointsAction: {
    padding: 8,
  },
  /* Sections */
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyActivityCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  /* Horizontal recent sessions list */
  horizontalListContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  recentSessionCard: {
    width: 220,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  recentSessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  recentCategoryName: {
    color: '#ffffff',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 11,
  },
  recentSessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentSessionDate: {
    color: '#64748b',
    fontSize: 11,
  },
  recentSessionMode: {
    color: '#64748b',
    fontSize: 11,
    marginLeft: 4,
  },
  /* Module list */
  categoriesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconBackground: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardName: {
    color: '#ffffff',
  },
  categoryCountText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryProgressOuter: {
    height: 6,
    backgroundColor: '#020617',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  categoryProgressInner: {
    height: '100%',
    backgroundColor: Colors.emerald[500],
    borderRadius: 3,
  },
  categorySubStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryAccuracy: {
    color: '#64748b',
    fontSize: 11,
  },
  weakSubBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.15)',
  },
  weakSubText: {
    color: Colors.rose[500],
    fontSize: 10,
    fontWeight: '700',
  },
});

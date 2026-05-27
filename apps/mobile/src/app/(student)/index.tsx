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
      {/* Pinned Top Bar Header */}
      <View style={styles.header}>
        <View style={styles.headerWelcome}>
          <View style={styles.stethoscopeBadge}>
            <Stethoscope color="#ffffff" size={20} />
          </View>
          <ThemedText style={styles.headerAppName} type="smallBold">Nawa Q-Bank</ThemedText>
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
        {/* Hero Welcome Glass Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroGradient1} />
          <View style={styles.heroGradient2} />
          
          <View style={styles.heroContent}>
            <ThemedText style={styles.heroWelcomeTitle} type="title">
              Welcome back, <ThemedText style={{ color: Colors.emerald[400], fontWeight: '800' }} type="title">{getFirstName()}</ThemedText>!
            </ThemedText>
            <ThemedText style={styles.heroWelcomeSub} type="small">
              Ready to crush your exams today? Let's keep that momentum going.
            </ThemedText>

            {/* Quick Metrics row */}
            <View style={styles.heroMetricsRow}>
              {/* Card 1: Rank */}
              <View style={styles.heroMetricBadge}>
                <View style={[styles.heroMetricIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Award color={Colors.emerald[400]} size={16} />
                </View>
                <View style={{ gap: 1 }}>
                  <ThemedText style={styles.heroMetricLabel} type="small">Overall Rank</ThemedText>
                  <ThemedText style={styles.heroMetricValue} type="smallBold">
                    {overall?.rank ? `#${overall.rank}` : '-'}
                  </ThemedText>
                </View>
              </View>

              {/* Card 2: Streak */}
              <View style={styles.heroMetricBadge}>
                <View style={[styles.heroMetricIconBg, { backgroundColor: 'rgba(251, 146, 60, 0.15)' }]}>
                  <Flame color={Colors.orange[400]} size={16} fill={Colors.orange[400]} />
                </View>
                <View style={{ gap: 1 }}>
                  <ThemedText style={styles.heroMetricLabel} type="small">Streak</ThemedText>
                  <ThemedText style={styles.heroMetricValue} type="smallBold">
                    {user?.current_streak || 0} Days
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Stack */}
        <View style={styles.ctaGridContainer}>
          {/* Action 1: Create Custom Quiz */}
          <TouchableOpacity
            style={[styles.actionCtaCard, { borderColor: 'rgba(16, 185, 129, 0.25)', backgroundColor: 'rgba(16, 185, 129, 0.02)' }]}
            onPress={() => router.push('/(student)/study')}
            activeOpacity={0.85}
          >
            <View style={styles.ctaLeft}>
              <View style={[styles.ctaIconBg, { borderColor: 'rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                <BookOpen color={Colors.emerald[400]} size={20} />
              </View>
              <View style={styles.ctaText}>
                <ThemedText style={styles.ctaTitle} type="smallBold">Create Custom Quiz</ThemedText>
                <ThemedText style={styles.ctaSubtitle} type="small">Generate a personalized exam tailored to specific topics.</ThemedText>
              </View>
            </View>
            <ChevronRight color={Colors.emerald[400]} size={18} />
          </TouchableOpacity>

          {/* Action 2: Review Weak Points */}
          <TouchableOpacity
            style={[styles.actionCtaCard, { borderColor: 'rgba(244, 63, 94, 0.25)', backgroundColor: 'rgba(244, 63, 94, 0.02)' }]}
            onPress={() => router.push('/(student)/study?pool=Incorrect')}
            activeOpacity={0.85}
          >
            <View style={styles.ctaLeft}>
              <View style={[styles.ctaIconBg, { borderColor: 'rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.08)' }]}>
                <AlertTriangle color={Colors.rose[500]} size={20} />
              </View>
              <View style={styles.ctaText}>
                <ThemedText style={styles.ctaTitle} type="smallBold">Review Weak Points</ThemedText>
                <ThemedText style={styles.ctaSubtitle} type="small">Focus on questions you've struggled with to improve scores.</ThemedText>
              </View>
            </View>
            <ChevronRight color={Colors.rose[500]} size={18} />
          </TouchableOpacity>
        </View>

        {/* Section: Progress Overview */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle} type="smallBold">Your Progress Overview</ThemedText>
        </View>

        <View style={styles.progressOverviewGrid}>
          {/* Card 1: Total Answered */}
          <View style={[styles.progressOverviewCard, { borderLeftColor: '#6366f1' }]}>
            <View style={styles.overviewCardHeader}>
              <BookOpen color="#818cf8" size={14} />
              <ThemedText style={[styles.overviewCardLabel, { color: '#818cf8' }]} type="small">TOTAL QUESTIONS</ThemedText>
            </View>
            <ThemedText style={styles.overviewCardValue} type="subtitle">
              {overall?.total_answered || 0}
            </ThemedText>
          </View>

          {/* Card 2: Overall Accuracy */}
          <View style={[styles.progressOverviewCard, { borderLeftColor: Colors.emerald[500] }]}>
            <View style={styles.overviewCardHeader}>
              <Award color={Colors.emerald[400]} size={14} />
              <ThemedText style={[styles.overviewCardLabel, { color: Colors.emerald[400] }]} type="small">OVERALL ACCURACY</ThemedText>
            </View>
            <View style={{ gap: 4 }}>
              <ThemedText style={styles.overviewCardValue} type="subtitle">
                {overall?.accuracy_percentage !== undefined ? `${overall.accuracy_percentage.toFixed(0)}%` : '0%'}
              </ThemedText>
              <View style={styles.overviewProgressBarOuter}>
                <View style={[styles.overviewProgressBarInner, { width: `${overall?.accuracy_percentage || 0}%` }]} />
              </View>
            </View>
          </View>

          {/* Card 3: Correct Answers */}
          <View style={[styles.progressOverviewCard, { borderLeftColor: '#10b981' }]}>
            <View style={styles.overviewCardHeader}>
              <CheckCircle color="#34d399" size={14} />
              <ThemedText style={[styles.overviewCardLabel, { color: '#34d399' }]} type="small">CORRECT ANSWERS</ThemedText>
            </View>
            <ThemedText style={styles.overviewCardValue} type="subtitle">
              {overall?.correct_count || 0}
            </ThemedText>
          </View>

          {/* Card 4: Weak Points */}
          <View style={[styles.progressOverviewCard, { borderLeftColor: Colors.rose[500] }]}>
            <View style={styles.overviewCardHeader}>
              <AlertTriangle color={Colors.rose[500]} size={14} />
              <ThemedText style={[styles.overviewCardLabel, { color: Colors.rose[500] }]} type="small">WEAK POINTS</ThemedText>
            </View>
            <ThemedText style={styles.overviewCardValue} type="subtitle">
              {overall?.weak_points_count || 0}
            </ThemedText>
          </View>
        </View>

        {/* Section: Recent Activity Vertical list */}
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={styles.sectionTitle} type="smallBold">Recent Quiz Activity</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(student)/profile')}>
            <ThemedText style={styles.sectionActionText} type="small">View Profile</ThemedText>
          </TouchableOpacity>
        </View>

        {recentSessions.length === 0 ? (
          <View style={styles.emptyActivityCard}>
            <Clock color={Colors.slate[400]} size={24} style={{ marginBottom: 8 }} />
            <ThemedText style={{ color: Colors.slate[400], textAlign: 'center', marginBottom: 12 }} type="small">
              No recent quizzes recorded. Go to the Study Hub to generate one!
            </ThemedText>
            <TouchableOpacity
              style={styles.emptyActivityBtn}
              onPress={() => router.push('/(student)/study')}
              activeOpacity={0.8}
            >
              <ThemedText style={{ color: '#ffffff' }} type="smallBold">
                Start Learning Now
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.verticalRecentFeed}>
            {recentSessions.slice(0, 3).map((quiz) => {
              const score = Math.round(quiz.score_percentage || 0);
              return (
                <View key={quiz.session_id} style={styles.recentFeedItem}>
                  <View style={styles.feedItemLeft}>
                    <View style={[
                      styles.scoreCircleBg,
                      { backgroundColor: score >= 80 ? 'rgba(16, 185, 129, 0.08)' : score >= 50 ? 'rgba(251, 146, 60, 0.08)' : 'rgba(244, 63, 94, 0.08)' }
                    ]}>
                      {score >= 80 ? (
                        <CheckCircle color={Colors.emerald[400]} size={16} />
                      ) : score >= 50 ? (
                        <Award color={Colors.orange[400]} size={16} />
                      ) : (
                        <AlertTriangle color={Colors.rose[500]} size={16} />
                      )}
                    </View>
                    
                    <View style={{ flex: 1, gap: 2 }}>
                      <ThemedText style={styles.feedItemName} type="smallBold" numberOfLines={1}>
                        {quiz.quiz_name || quiz.category_name || `Quiz Session #${quiz.session_id.substring(0, 8)}`}
                      </ThemedText>
                      <View style={styles.feedItemSubRow}>
                        <Clock color={Colors.slate[400]} size={10} />
                        <ThemedText style={styles.feedItemSubText} type="small">
                          {new Date(quiz.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </ThemedText>
                        <ThemedText style={styles.feedItemSubText} type="small">
                          • {quiz.total_questions} Qs
                        </ThemedText>
                        <ThemedText style={styles.feedItemSubText} type="small">
                          • <ThemedText style={{ color: quiz.status === 'in_progress' ? Colors.orange[400] : Colors.emerald[400] }} type="small">{quiz.status === 'in_progress' ? 'In Progress' : 'Completed'}</ThemedText>
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.feedItemRight}>
                    <ThemedText style={[
                      styles.feedItemScoreText,
                      { color: score >= 80 ? Colors.emerald[400] : score >= 50 ? Colors.orange[400] : Colors.rose[500] }
                    ]} type="smallBold">
                      {score}%
                    </ThemedText>
                    <ThemedText style={{ color: '#64748b', fontSize: 10 }} type="small">Score</ThemedText>
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
  /* Welcome header minimal */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b', // navy-800
    backgroundColor: '#020617',
  },
  headerWelcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAppName: {
    color: '#ffffff',
    fontSize: 15,
  },
  stethoscopeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Hero card glass styling */
  heroCard: {
    backgroundColor: '#0f172a',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGradient1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  heroGradient2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  heroContent: {
    gap: 16,
    zIndex: 1,
  },
  heroWelcomeTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  heroWelcomeSub: {
    color: '#94a3b8',
    lineHeight: 18,
    fontSize: 13,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  heroMetricBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  heroMetricIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMetricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  heroMetricValue: {
    color: '#ffffff',
    fontSize: 12,
  },
  /* CTA Stack styles */
  ctaGridContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 18,
  },
  actionCtaCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ctaIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  ctaText: {
    flex: 1,
    gap: 1,
  },
  ctaTitle: {
    color: '#ffffff',
    fontSize: 14,
  },
  ctaSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 14,
  },
  /* Progress Overview Grid (2x2) */
  progressOverviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  progressOverviewCard: {
    width: (width - 52) / 2,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderLeftWidth: 3,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  overviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overviewCardValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  overviewProgressBarOuter: {
    height: 4,
    backgroundColor: '#020617',
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  overviewProgressBarInner: {
    height: '100%',
    backgroundColor: Colors.emerald[500],
    borderRadius: 2,
  },
  /* Recent Quiz Activity vertical list styles */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionActionText: {
    color: Colors.emerald[400],
    fontWeight: '600',
  },
  verticalRecentFeed: {
    marginHorizontal: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 4,
  },
  recentFeedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  feedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scoreCircleBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedItemName: {
    color: '#ffffff',
    fontSize: 13,
  },
  feedItemSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedItemSubText: {
    color: '#64748b',
    fontSize: 10,
  },
  feedItemRight: {
    alignItems: 'flex-end',
    paddingLeft: 10,
  },
  feedItemScoreText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  /* Shared standard components */
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
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
  emptyActivityBtn: {
    backgroundColor: Colors.emerald[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  /* Module progress list */
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

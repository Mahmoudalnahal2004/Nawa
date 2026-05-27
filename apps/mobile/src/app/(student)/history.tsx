import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, History, Award, CheckCircle, AlertTriangle, BookOpen, ChevronRight } from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import api from '../../lib/api';
import { ThemedText } from '@/components/themed-text';

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

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<RecentSession[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/analytics/me');
      setSessions(res.data.recent_sessions || []);
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald[500]} />
          <ThemedText style={{ color: '#94a3b8', marginTop: 12 }} type="small">Loading mock session logs...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Quick Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ gap: 2 }}>
            <ThemedText style={{ color: '#ffffff' }} type="subtitle">Exam Log History</ThemedText>
            <ThemedText style={{ color: '#94a3b8' }} type="small">Review your previous mock attempts and scores</ThemedText>
          </View>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <History color={Colors.slate[400]} size={36} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: '#ffffff', textAlign: 'center' }} type="smallBold">
              No Quiz Attempts Recorded Yet
            </ThemedText>
            <ThemedText style={{ color: '#94a3b8', textAlign: 'center', fontSize: 11, marginTop: 4, marginBottom: 16 }} type="small">
              Generate your very first clinical session and start learning today!
            </ThemedText>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/(student)/study')}
              activeOpacity={0.8}
            >
              <ThemedText style={{ color: '#ffffff' }} type="smallBold">
                Start First Mock Exam
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {sessions.map((quiz) => {
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
                          {new Date(quiz.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
  },
  ctaBtn: {
    backgroundColor: Colors.emerald[500],
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  listContainer: {
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
    padding: 16,
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
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronRight, Stethoscope, Award, CheckCircle } from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import api from '../../lib/api';
import { ThemedText } from '@/components/themed-text';

interface WeakCategory {
  category_id: number;
  category_name: string;
  total_questions: number;
  answered_count: number;
  correct_count: number;
  accuracy_percentage: number;
}

export default function WeakPointsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weakCategories, setWeakCategories] = useState<WeakCategory[]>([]);
  const [totalWeakPoints, setTotalWeakPoints] = useState(0);

  const fetchWeakPoints = async () => {
    try {
      const res = await api.get('/analytics/me');
      const { categories, overall } = res.data;
      
      // Filter categories with accuracy < 70% to list as weak points
      const weak = (categories || []).filter((c: any) => c.accuracy_percentage < 70 && c.answered_count > 0);
      setWeakCategories(weak);
      setTotalWeakPoints(overall?.weak_points_count || 0);
    } catch (err) {
      console.error('Failed to fetch weak points:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeakPoints();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.rose[500]} />
          <ThemedText style={{ color: '#94a3b8', marginTop: 12 }} type="small">Analyzing clinical weak points...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Banner Alert Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerLeft}>
            <AlertTriangle color={Colors.rose[500]} size={24} />
            <View style={{ gap: 2, flex: 1 }}>
              <ThemedText style={{ color: '#ffffff' }} type="smallBold">Missed Concepts Detected</ThemedText>
              <ThemedText style={{ color: '#94a3b8', fontSize: 11 }} type="small">
                We've identified {totalWeakPoints} clinical concepts that need reinforcement.
              </ThemedText>
            </View>
          </View>
        </View>

        {/* CTA Launcher */}
        <TouchableOpacity
          style={styles.launcherBtn}
          onPress={() => router.push('/(student)/study?pool=Incorrect')}
          activeOpacity={0.85}
        >
          <View style={styles.launcherIconBg}>
            <Stethoscope color="#ffffff" size={18} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <ThemedText style={{ color: '#ffffff' }} type="smallBold">Launch Targeted Mock</ThemedText>
            <ThemedText style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }} type="small">
              Generate a custom mock using only your incorrect questions
            </ThemedText>
          </View>
          <ChevronRight color="#ffffff" size={16} />
        </TouchableOpacity>

        {/* List Header */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle} type="smallBold">Specialities Needing Review (&lt;70% Accuracy)</ThemedText>
        </View>

        {weakCategories.length === 0 ? (
          <View style={styles.emptyCard}>
            <CheckCircle color={Colors.emerald[500]} size={24} style={{ marginBottom: 8 }} />
            <ThemedText style={{ color: '#ffffff', textAlign: 'center' }} type="smallBold">
              All Specialities Clear!
            </ThemedText>
            <ThemedText style={{ color: '#94a3b8', textAlign: 'center', fontSize: 11, marginTop: 2 }} type="small">
              Keep answering questions. We will track your accuracy here!
            </ThemedText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {weakCategories.map((cat) => (
              <View key={cat.category_id} style={styles.categoryRow}>
                <View style={styles.rowHeader}>
                  <ThemedText style={{ color: '#ffffff' }} type="smallBold">{cat.category_name}</ThemedText>
                  <ThemedText style={{ color: Colors.rose[500], fontSize: 12, fontWeight: '700' }} type="small">
                    {cat.accuracy_percentage.toFixed(0)}% Accuracy
                  </ThemedText>
                </View>
                
                {/* Visual bar */}
                <View style={styles.progressBarOuter}>
                  <View style={[styles.progressBarInner, { width: `${cat.accuracy_percentage}%` }]} />
                </View>

                <View style={styles.rowFooter}>
                  <ThemedText style={{ color: '#64748b', fontSize: 10 }} type="small">
                    Answered: {cat.answered_count} Qs
                  </ThemedText>
                  <ThemedText style={{ color: '#64748b', fontSize: 10 }} type="small">
                    Incorrect: {cat.answered_count - cat.correct_count} Qs
                  </ThemedText>
                </View>
              </View>
            ))}
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
  bannerCard: {
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.15)',
    borderRadius: 18,
    padding: 16,
  },
  bannerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  launcherBtn: {
    backgroundColor: Colors.rose[500],
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: Colors.rose[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  launcherIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    marginBottom: -8,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
  },
  listContainer: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 4,
  },
  categoryRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    gap: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarOuter: {
    height: 6,
    backgroundColor: '#020617',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: Colors.rose[500],
    borderRadius: 3,
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

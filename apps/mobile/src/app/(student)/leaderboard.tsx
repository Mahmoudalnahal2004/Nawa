import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Trophy, Award, Medal, Stethoscope, Clock, Shield } from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import api from '../../lib/api';
import { ThemedText } from '@/components/themed-text';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  correct_count: number;
  total_answered: number;
  accuracy_percentage: number;
}

export default function LeaderboardScreen() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const fetchLeaderboard = async () => {
    try {
      // Fetch category 0 which returns the overall global mock leaderboard
      const res = await api.get('/analytics/leaderboard/0');
      setEntries(res.data || []);
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald[500]} />
          <ThemedText style={{ color: '#94a3b8', marginTop: 12 }} type="small">Fetching global student ranks...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const topThree = entries.slice(0, 3);
  const restEntries = entries.slice(3);

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy color="#f59e0b" size={24} fill="#f59e0b" />; // gold
      case 2:
        return <Medal color="#94a3b8" size={24} fill="#94a3b8" />; // silver
      case 3:
        return <Medal color="#b45309" size={24} fill="#b45309" />; // bronze
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <Trophy color={Colors.emerald[400]} size={28} style={{ marginBottom: 4 }} />
          <ThemedText style={{ color: '#ffffff' }} type="subtitle">Doctor Leaderboard</ThemedText>
          <ThemedText style={{ color: '#94a3b8', textAlign: 'center' }} type="small">
            Top medical students ranking based on correct answers and mock accuracy
          </ThemedText>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Shield color={Colors.slate[400]} size={36} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: '#ffffff', textAlign: 'center' }} type="smallBold">
              Leaderboard Empty
            </ThemedText>
            <ThemedText style={{ color: '#94a3b8', textAlign: 'center', fontSize: 11, marginTop: 4 }} type="small">
              No clinical sessions submitted yet. Start answering mocks to set your rank!
            </ThemedText>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Top 3 Visual Podiums */}
            {topThree.length > 0 && (
              <View style={styles.podiumContainer}>
                {topThree.map((item) => (
                  <View key={item.user_id} style={[
                    styles.podiumCard,
                    item.rank === 1 && styles.goldCard
                  ]}>
                    <View style={styles.podiumRankBadge}>
                      {getMedalIcon(item.rank)}
                    </View>
                    <ThemedText style={styles.podiumName} type="smallBold" numberOfLines={1}>
                      {item.display_name}
                    </ThemedText>
                    <ThemedText style={styles.podiumAccuracy} type="small">
                      {item.accuracy_percentage.toFixed(0)}%
                    </ThemedText>
                    <ThemedText style={styles.podiumCount} type="small">
                      {item.correct_count} Qs
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            {/* Rest of the ranks table list */}
            {restEntries.length > 0 && (
              <View style={styles.tableCard}>
                {restEntries.map((item) => (
                  <View key={item.user_id} style={styles.tableRow}>
                    <View style={styles.rowLeft}>
                      <View style={styles.rankCircle}>
                        <ThemedText style={{ color: '#94a3b8', fontWeight: '800' }} type="small">
                          {item.rank}
                        </ThemedText>
                      </View>
                      <ThemedText style={{ color: '#ffffff' }} type="smallBold">
                        {item.display_name}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.rowRight}>
                      <ThemedText style={{ color: Colors.emerald[400], fontWeight: '800', fontSize: 13 }} type="smallBold">
                        {item.accuracy_percentage.toFixed(0)}%
                      </ThemedText>
                      <ThemedText style={{ color: '#64748b', fontSize: 10 }} type="small">
                        {item.correct_count}/{item.total_answered} Qs
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
  headerBlock: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
  },
  /* Podium layout styling */
  podiumContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  podiumCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    height: 140,
    justifyContent: 'center',
  },
  goldCard: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
    height: 154,
    marginTop: -7,
  },
  podiumRankBadge: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumName: {
    color: '#ffffff',
    fontSize: 12,
  },
  podiumAccuracy: {
    color: Colors.emerald[400],
    fontSize: 14,
    fontWeight: '800',
  },
  podiumCount: {
    color: '#64748b',
    fontSize: 10,
  },
  /* Table layout styling */
  tableCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 4,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
});

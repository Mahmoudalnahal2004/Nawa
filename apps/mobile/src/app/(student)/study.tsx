import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BookOpen } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

export default function StudyHub() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.iconBackground}>
        <BookOpen color={Colors.emerald[500]} size={42} />
      </View>
      <ThemedText type="title" style={styles.title}>Study Hub</ThemedText>
      <ThemedText type="default" style={styles.desc}>
        Access practice materials, customizable quizzes, adaptive mock exams, and customized reviews. Coming soon!
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#020617', // navy-950
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  desc: {
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});

// Helper view import compatibility
import { View } from 'react-native';

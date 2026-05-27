import { StyleSheet, Button } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '../../store/auth-store';

export default function StudentProfile() {
  const { user, logout } = useAuthStore();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Profile</ThemedText>
      <ThemedText type="default">Email: {user?.email}</ThemedText>
      <ThemedText type="default">Name: {user?.full_name}</ThemedText>
      <Button title="Logout" onPress={logout} color="#ef4444" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
});

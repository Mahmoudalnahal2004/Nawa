import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import {
  Stethoscope,
  LogOut,
  User,
  BookOpen,
  History,
  StickyNote,
  Award,
  AlertTriangle,
  Home,
  LayoutDashboard
} from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth-store';
import { ThemedText } from '@/components/themed-text';

const { width } = Dimensions.get('window');

// Custom Drawer Component with Safe Areas & Premium Vibe
function CustomDrawerContent(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  // Nav list configuration matching web sidebar exactly
  const menuItems = [
    { name: 'Dashboard', path: '/(student)', icon: Home },
    { name: 'Create Quiz', path: '/(student)/create-quiz', icon: LayoutDashboard },
    { name: 'Study Hub', path: '/(student)/study', icon: BookOpen },
    { name: 'Weak Points', path: '/(student)/weak-points', icon: AlertTriangle },
    { name: 'History', path: '/(student)/history', icon: History },
    { name: 'My Notes', path: '/(student)/notes', icon: StickyNote },
    { name: 'Leaderboard', path: '/(student)/leaderboard', icon: Award },
    { name: 'Profile', path: '/(student)/profile', icon: User },
  ];

  return (
    <View style={[styles.drawerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Drawer Header Logo block */}
      <View style={styles.drawerHeader}>
        <View style={styles.logoBadge}>
          <Stethoscope color="#ffffff" size={18} />
        </View>
        <View style={{ gap: 1 }}>
          <ThemedText style={styles.logoText} type="smallBold">Nawa Q-Bank</ThemedText>
          <ThemedText style={{ color: Colors.emerald[400], fontSize: 10, fontWeight: '700' }} type="small">STUDENT PORTAL</ThemedText>
        </View>
      </View>

      {/* Navigator Navigation Scroll List */}
      <ScrollView contentContainerStyle={{ paddingTop: 10 }} bounces={false}>
        <View style={styles.menuItemsList}>
          {menuItems.map((item) => {
            // Check active route matching pathname
            const isActive = pathname === item.path || (item.path === '/(student)' && pathname === '/(student)/');
            const Icon = item.icon;

            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => {
                  props.navigation.closeDrawer();
                  router.push(item.path as any);
                }}
                activeOpacity={0.8}
              >
                <Icon color={isActive ? Colors.emerald[400] : '#94a3b8'} size={18} />
                <ThemedText
                  style={[styles.menuItemText, isActive && { color: Colors.emerald[400] }]}
                  type="smallBold"
                >
                  {item.name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Drawer Footer showing Profile and Logout */}
      <View style={styles.drawerFooter}>
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <ThemedText style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }} type="smallBold">
              {user?.full_name?.charAt(0).toUpperCase() || 'D'}
            </ThemedText>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <ThemedText style={styles.profileName} type="smallBold" numberOfLines={1}>
              {user?.full_name || 'Dr. Student'}
            </ThemedText>
            <ThemedText style={styles.profileRole} type="small" numberOfLines={1}>
              {user?.study_year ? `${user.study_year} Year Student` : 'Medical Student'}
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut color={Colors.rose[500]} size={16} />
          <ThemedText style={{ color: Colors.rose[500] }} type="smallBold">Log Out</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Student Drawer Shell Navigator Controller
export default function StudentLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#020617', // navy-950
            borderBottomWidth: 1,
            borderBottomColor: '#1e293b', // navy-800
            height: 56,
          },
          headerTitleStyle: {
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '800',
          },
          headerTintColor: '#ffffff',
          drawerStyle: {
            backgroundColor: '#0f172a', // navy-900
            width: 280,
          },
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: 'Home Dashboard',
          }}
        />
        <Drawer.Screen
          name="create-quiz"
          options={{
            title: 'Create Custom Quiz',
          }}
        />
        <Drawer.Screen
          name="study"
          options={{
            title: 'Study Hub',
          }}
        />
        <Drawer.Screen
          name="weak-points"
          options={{
            title: 'Review Weak Points',
          }}
        />
        <Drawer.Screen
          name="history"
          options={{
            title: 'Mock History',
          }}
        />
        <Drawer.Screen
          name="notes"
          options={{
            title: 'My Notes',
          }}
        />
        <Drawer.Screen
          name="leaderboard"
          options={{
            title: 'Score Leaderboard',
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            title: 'Doctor Profile',
          }}
        />
        {/* Hide the dynamic quiz route from drawer selections */}
        <Drawer.Screen
          name="quiz/[sessionId]"
          options={{
            headerShown: false,
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#0f172a', // navy-900
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 15,
  },
  menuItemsList: {
    paddingHorizontal: 12,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  menuItemText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.3)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 12,
  },
  profileRole: {
    color: '#64748b',
    fontSize: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.04)',
    gap: 8,
    justifyContent: 'center',
  },
});

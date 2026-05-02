import React, { useEffect } from 'react';
import { Modal, StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from './Typography';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeOut, 
  FadeInUp,
  FadeOutDown
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { AnimatedButton } from './AnimatedButton';

interface AppAlertModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
  loading?: boolean;
}

export function AppAlertModal({ 
  visible, 
  type, 
  title, 
  message, 
  onClose, 
  confirmText = "Continue",
  loading = false 
}: AppAlertModalProps) {
  const colors = useColors();

  useEffect(() => {
    if (visible) {
      if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [visible]);

  const getIcon = () => {
    switch (type) {
      case 'success': return { name: 'check-circle' as const, color: '#10B981', bg: '#D1FAE5' };
      case 'error': return { name: 'x-circle' as const, color: '#EF4444', bg: '#FEE2E2' };
      case 'warning': return { name: 'alert-triangle' as const, color: '#F59E0B', bg: '#FEF3C7' };
      default: return { name: 'info' as const, color: colors.primary, bg: colors.primary + '15' };
    }
  };

  const iconData = getIcon();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(200)}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.springify().damping(15)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.modalCard, { backgroundColor: colors.card }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: iconData.bg }]}>
            <Feather name={iconData.name} size={32} color={iconData.color} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          <AnimatedButton
            onPress={onClose}
            disabled={loading}
            style={[styles.button, { backgroundColor: type === 'error' ? '#EF4444' : colors.primary }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{confirmText}</Text>
            )}
          </AnimatedButton>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.15)',
    elevation: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

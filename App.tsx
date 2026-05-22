// App.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useUIStore } from './src/store/useUIStore';

export default function App() {
  const { theme } = useUIStore();

  const getStatusBarStyle = () => {
    switch (theme) {
      case 'light':
        return 'dark';
      case 'emerald':
      case 'dark':
      case 'nightMosque':
      default:
        return 'light';
    }
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <View style={styles.container}>
        <StatusBar style={getStatusBarStyle()} />
        <AppNavigator />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

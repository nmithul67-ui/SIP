// tablet/src/screens/DemoModeManager.tsx
/**
 * DemoModeManager – UI for demo presentations.
 * Loads seed data and provides a router-kill simulation.
 */
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { loadSeedData } from '../services/seedData';
import { toggleWifi } from '../services/wifiSimulator';

const DemoModeManager: React.FC = () => {
  const [demoActive, setDemoActive] = useState(false);

  const startDemo = async () => {
    try {
      await loadSeedData();
      setDemoActive(true);
      Alert.alert('Demo', 'Seed data loaded, demo started');
    } catch (e) {
      Alert.alert('Error', 'Failed to load seed data');
    }
  };

  const simulateRouterKill = () => {
    toggleWifi(false);
    setTimeout(() => toggleWifi(true), 5000);
    Alert.alert('Router Kill', 'Wi-Fi disabled for 5?seconds');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demo Mode Manager</Text>
      {!demoActive && <Button title= Start Demo onPress={startDemo} />}
      {demoActive && <Button title=Simulate Router Kill onPress={simulateRouterKill} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 20, fontWeight: '600' },
});

export default DemoModeManager;

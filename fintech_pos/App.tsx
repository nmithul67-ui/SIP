import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  View,
  Platform,
} from 'react-native';
import { POSMasterScreen } from './src/screens/POSMasterScreen';
import { COLORS } from './src/theme/tokens';

export default function App() {
  return (
    <SafeAreaView style={styles.rootSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.tabletCanvas}>
        <POSMasterScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootSafeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web'
      ? {
          height: '100vh' as any,
          overflow: 'hidden' as any,
          userSelect: 'none' as any,
        }
      : {}),
  },
  tabletCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.canvas,
  },
});

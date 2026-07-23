import { Alert, Platform } from 'react-native';

/**
 * Boîte de confirmation compatible web et mobile.
 * - Sur web : window.confirm() (supporte les boutons Annuler/OK)
 * - Sur mobile : Alert.alert natif
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Confirmer'
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}

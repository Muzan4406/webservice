import { ScrollView, ScrollViewProps } from 'react-native';

// react-native-keyboard-controller removed — using standard ScrollView.
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = 'handled',
  ...props
}: ScrollViewProps & { keyboardShouldPersistTaps?: 'always' | 'never' | 'handled' }) {
  return (
    <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
      {children}
    </ScrollView>
  );
}

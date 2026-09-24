import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

import { photosStore, type PhotoCategory } from './photos';
import { toast } from './toast';

/** Asks how to add a photo (camera or library), takes it, stores it and starts the upload. */
export function addProgressPhoto(category: PhotoCategory, onAdded?: (id: string) => void) {
  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access is off', 'Allow the camera in Settings to take progress photos.', [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings() }]);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, cameraType: category === 'body' ? ImagePicker.CameraType.back : ImagePicker.CameraType.front });
    if (!res.canceled && res.assets[0]?.uri) await save(res.assets[0].uri);
  };
  const fromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, selectionLimit: 1 });
    if (!res.canceled && res.assets[0]?.uri) await save(res.assets[0].uri);
  };
  const save = async (uri: string) => {
    try {
      const photo = await photosStore.add(uri, category);
      toast.show('Photo saved to your account');
      onAdded?.(photo.id);
    } catch {
      toast.show("Couldn't save that photo");
    }
  };

  if (!Device.isDevice) {
    // Simulators have no camera; go straight to the library.
    void fromLibrary();
    return;
  }
  Alert.alert('Add a progress photo', undefined, [
    { text: 'Take photo', onPress: () => void fromCamera() },
    { text: 'Choose from library', onPress: () => void fromLibrary() },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

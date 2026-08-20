import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store keeps tokens in the platform keystore/keychain on
// Android/iOS — appropriate for auth tokens on a health app. It has no web
// implementation at all (throws immediately), so web falls back to
// localStorage — fine for local dev/testing in a browser, never used on a
// real device build.
const ACCESS_KEY = "aw_access_token";
const REFRESH_KEY = "aw_refresh_token";
const isWeb = Platform.OS === "web";

async function setItem(key: string, value: string) {
  if (isWeb) {
    window.localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (isWeb) {
    window.localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveTokens(access: string, refresh: string) {
  await setItem(ACCESS_KEY, access);
  await setItem(REFRESH_KEY, refresh);
}

export async function getAccessToken() {
  return getItem(ACCESS_KEY);
}

export async function getRefreshToken() {
  return getItem(REFRESH_KEY);
}

export async function clearTokens() {
  await deleteItem(ACCESS_KEY);
  await deleteItem(REFRESH_KEY);
}
